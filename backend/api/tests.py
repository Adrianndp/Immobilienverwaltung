from datetime import date, timedelta
from decimal import Decimal as D

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from .models import (
    Buchung,
    Darlehen,
    Einheit,
    Kostenart,
    Lieferant,
    Mieter,
    Mietobjekt,
    Mietvertrag,
    Rechnung,
    RechnungsAnteil,
    Zuordnung,
)
from .views.mietobjekt import letzte_12_monate

User = get_user_model()

CSV_KOPF = "buchungstag,wertstellung,kontoinhaber,buchungstext,buchungsart,betrag\n"


def mietobjekt(eigentuemer, **kw):
    return Mietobjekt.objects.create(
        eigentuemer=eigentuemer, name="Wohnung 1", strasse="Musterstr.", hausnummer="1", plz="88131",
        ort="Lindau", objektart="ETW", nutzung="VERMIETUNG", vermietung="GANZ", **kw,
    )


def darlehen(objekt, art=Darlehen.Art.ANNUITAET):
    return Darlehen.objects.create(
        mietobjekt=objekt, bank="Testbank", iban="DE00", beginn=date(2026, 1, 1), betrag=D("120000"),
        art=art, sollzins=D("3"), tilgung=D("2"),
    )


class DarlehenTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.objekt = mietobjekt(User.objects.create_user("a"))

    def test_annuitaet_hat_gleiche_rate_und_wird_ganz_getilgt(self):
        d = darlehen(self.objekt)
        plan = d.tilgungsplan()

        # 120000 * (3 % + 2 %) / 12
        self.assertEqual(d.rate(), D("500.00"))
        self.assertEqual(
            plan[0], {"datum": date(2026, 2, 1), "zins": D("300.00"), "tilgung": D("200.00"), "rest": D("119800.00")}
        )
        self.assertTrue(all(m["zins"] + m["tilgung"] == D("500.00") for m in plan[:-1]))
        self.assertEqual(plan[-1]["rest"], 0)

    def test_tilgungsdarlehen_hat_feste_tilgung(self):
        plan = darlehen(self.objekt, Darlehen.Art.TILGUNG).tilgungsplan()

        self.assertTrue(all(m["tilgung"] == D("200.00") for m in plan))
        self.assertEqual(plan[-1]["rest"], 0)

    def test_restschuld_und_zinsen(self):
        d = darlehen(self.objekt)

        self.assertEqual(d.restschuld(stichtag=date(2025, 12, 31)), D("120000"))
        self.assertEqual(d.restschuld(stichtag=date(2026, 2, 1)), D("119800.00"))
        self.assertEqual(d.zinsen(date(2026, 2, 1), date(2026, 2, 28)), D("300.00"))


class ApiTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("eigentuemer")
        self.client.force_authenticate(self.user)
        self.objekt = mietobjekt(self.user, grundstuecksflaeche=D("1000"), weg_anteil=D("50"), weg_nenner=1000)
        einheit = self.objekt.einheiten.create(name="Gesamt")
        mieter = Mieter.objects.create(eigentuemer=self.user, vorname="Anna", nachname="Schmidt")
        self.vertrag = Mietvertrag.objects.create(
            mieter=mieter, einheit=einheit, beginn=date(2026, 1, 1), kaltmiete=D("800"), nebenkosten=D("200")
        )
        lieferant = Lieferant.objects.create(eigentuemer=self.user, firmenname="Sanitär Huber")
        kostenart = Kostenart.objects.create(
            eigentuemer=self.user, name="Reparaturen", kategorie=Kostenart.Kategorie.INSTANDHALTUNG
        )
        self.rechnung = Rechnung.objects.create(
            lieferant=lieferant, kostenart=kostenart, datum=date(2026, 3, 1), name="Heizung",
            rechnungsnummer="R-1", betrag=D("400"),
        )
        RechnungsAnteil.objects.create(rechnung=self.rechnung, mietobjekt=self.objekt, prozent=D("50"))

    def buchung(self, betrag, tag=date(2026, 3, 5)):
        return Buchung.objects.create(
            eigentuemer=self.user, buchungstag=tag, wertstellung=tag, kontoinhaber="X",
            buchungstext="Test", buchungsart="Überweisung", betrag=D(betrag),
        )


class ZugriffTests(ApiTestCase):
    def test_ohne_login_kein_zugriff(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/mietobjekte/").status_code, 403)

    def test_fremde_mietobjekte_sind_unsichtbar(self):
        mietobjekt(User.objects.create_user("andere"))

        self.assertEqual([m["id"] for m in self.client.get("/api/mietobjekte/").json()], [self.objekt.id])

    def test_benutzer_ist_der_angemeldete(self):
        self.assertEqual(self.client.get("/api/benutzer/").json()["username"], "eigentuemer")


class BuchungTests(ApiTestCase):
    def importieren(self, inhalt):
        datei = SimpleUploadedFile("umsaetze.csv", inhalt.encode())
        return self.client.post("/api/buchungen/import/", {"datei": datei}, format="multipart")

    def test_import_ueberspringt_doppelte_zeilen(self):
        csv = CSV_KOPF + "2026-03-01,2026-03-01,Anna Schmidt,Miete,Überweisung,1000.00\n"

        self.assertEqual(self.importieren(csv).json(), {"importiert": 1, "uebersprungen": 0})
        self.assertEqual(self.importieren(csv).json(), {"importiert": 0, "uebersprungen": 1})

    def test_import_mit_kaputter_zeile_importiert_nichts(self):
        csv = CSV_KOPF + "2026-03-01,2026-03-01,A,Miete,Überweisung,1000.00\nkein-datum,,B,,,abc\n"

        self.assertEqual(self.importieren(csv).status_code, 400)
        self.assertFalse(Buchung.objects.exists())

    def zuordnen(self, buchung, **zuordnung):
        return self.client.patch(f"/api/buchungen/{buchung.id}/", {"zuordnungen": [zuordnung]}, format="json")

    def test_eingang_einem_mietvertrag_zuordnen(self):
        r = self.zuordnen(self.buchung("1000"), betrag="1000", mietvertrag=self.vertrag.id)

        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["partner"], "Anna Schmidt")

    def test_eingang_kann_keiner_rechnung_zugeordnet_werden(self):
        r = self.zuordnen(self.buchung("400"), betrag="400", rechnung=self.rechnung.id)

        self.assertEqual(r.status_code, 400)

    def test_zuordnungen_duerfen_nicht_hoeher_als_buchung_sein(self):
        r = self.zuordnen(self.buchung("-100"), betrag="150", rechnung=self.rechnung.id)

        self.assertEqual(r.status_code, 400)


class RechnungTests(ApiTestCase):
    def test_anteile_muessen_100_prozent_ergeben(self):
        r = self.client.post("/api/rechnungen/", {
            "lieferant": self.rechnung.lieferant_id, "kostenart": self.rechnung.kostenart_id, "datum": "2026-04-01",
            "name": "Test", "rechnungsnummer": "R-2", "betrag": "100",
            "anteile": [{"mietobjekt": self.objekt.id, "prozent": "80"}],
        }, format="json")

        self.assertEqual(r.status_code, 400)

    def test_bezahlte_rechnung_kann_nicht_geloescht_werden(self):
        Zuordnung.objects.create(buchung=self.buchung("-400"), betrag=D("400"), rechnung=self.rechnung)

        self.assertEqual(self.client.delete(f"/api/rechnungen/{self.rechnung.id}/").status_code, 400)


class AuswertungTests(ApiTestCase):
    def test_anlage_v(self):
        Zuordnung.objects.create(buchung=self.buchung("1000"), betrag=D("1000"), mietvertrag=self.vertrag)
        Zuordnung.objects.create(buchung=self.buchung("-400"), betrag=D("400"), rechnung=self.rechnung)
        darlehen(self.objekt)

        r = self.client.get(f"/api/auswertung/anlage-v/?mietobjekt={self.objekt.id}&jahr=2026").json()

        self.assertEqual(r["kaltmiete_summe"], "800.00")
        self.assertEqual(r["nebenkosten_summe"], "200.00")
        # 50 % of the paid Rechnung
        self.assertEqual(r["instandhaltung"], "200.00")
        self.assertEqual(D(r["ueberschuss"]), D("1000") - D("200") - D(r["schuldzinsen"]))

    def test_deckungsbeitrag_mit_ungueltigem_monat(self):
        r = self.client.get(f"/api/auswertung/deckungsbeitrag/?mietobjekt={self.objekt.id}&jahr=2026&monat=13")

        self.assertEqual(r.status_code, 400)


class BodenrichtwertTests(ApiTestCase):
    def test_grundstueckswert_mit_weg_anteil(self):
        daten = {"mietobjekt": self.objekt.id, "datum": "2026-01-01", "wert": "300"}

        r = self.client.post("/api/bodenrichtwerte/", daten, format="json")

        # 1000 m² * 50/1000 * 300 €/m²
        self.assertEqual(r.json()["grundstueckswert"], "15000.00")
        self.assertEqual(self.client.get(f"/api/mietobjekte/{self.objekt.id}/").json()["bodenrichtwert"], "300.00")

    def test_doppeltes_datum_wird_abgelehnt(self):
        daten = {"mietobjekt": self.objekt.id, "datum": "2026-01-01", "wert": "300"}
        self.client.post("/api/bodenrichtwerte/", daten, format="json")

        self.assertEqual(self.client.post("/api/bodenrichtwerte/", daten, format="json").status_code, 400)


class AnmeldenTests(TestCase):
    def setUp(self):
        User.objects.create_user("eigentuemer", password="geheim-123")
        # Like a browser: CSRF is checked, so the token comes from the GET.
        self.client = APIClient(enforce_csrf_checks=True)

    def anmelden(self, password, mit_token=True):
        self.client.get("/api/auth/anmelden/")
        token = self.client.cookies["csrftoken"].value if mit_token else ""
        return self.client.post(
            "/api/auth/anmelden/", {"username": "eigentuemer", "password": password}, format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_anmelden_und_abmelden(self):
        self.assertEqual(self.anmelden("geheim-123").json()["username"], "eigentuemer")
        self.assertTrue(self.client.get("/api/auth/anmelden/").json()["angemeldet"])

        token = self.client.cookies["csrftoken"].value
        self.assertEqual(self.client.post("/api/auth/abmelden/", HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(self.client.get("/api/benutzer/").status_code, 403)

    def test_falsches_passwort(self):
        antwort = self.anmelden("falsch")

        self.assertEqual(antwort.status_code, 400)
        self.assertFalse(self.client.get("/api/auth/anmelden/").json()["angemeldet"])

    def test_ohne_csrf_token_abgelehnt(self):
        self.assertEqual(self.anmelden("geheim-123", mit_token=False).status_code, 403)


class ErwirtschafteterBetragTests(ApiTestCase):
    def betrag(self):
        return self.client.get(f"/api/mietobjekte/{self.objekt.id}/").json()["erwirtschafteter_betrag"]

    def test_miete_minus_kosten_minus_zinsen_der_letzten_12_monate(self):
        heute = timezone.localdate()
        for tag in (heute - timedelta(days=400), heute - timedelta(days=30)):
            self.buchung("1000", tag=tag).zuordnungen.create(betrag=D("1000"), mietvertrag=self.vertrag)
        self.rechnung.datum = heute - timedelta(days=30)
        self.rechnung.save()
        d = darlehen(self.objekt)

        # Only the recent rent, minus 50 % of the 400 € Rechnung, minus the interest of the period.
        self.assertEqual(D(self.betrag()), D("1000") - D("200") - d.zinsen(*letzte_12_monate()))

    def test_eigennutzung_hat_keinen_betrag(self):
        self.objekt.nutzung = Mietobjekt.Nutzung.EIGEN
        self.objekt.save()

        self.assertIsNone(self.betrag())


class WegAnteilTests(ApiTestCase):
    def patch(self, **daten):
        return self.client.patch(f"/api/mietobjekte/{self.objekt.id}/", daten, format="json")

    def test_ohne_weg_objektart_wird_der_anteil_geleert(self):
        antwort = self.patch(objektart="ZFH")

        self.assertEqual(antwort.status_code, 200)
        self.assertEqual((antwort.json()["weg_anteil"], antwort.json()["weg_nenner"]), (None, None))

    def test_neues_efh_speichert_keinen_anteil(self):
        antwort = self.client.post("/api/mietobjekte/", {
            "name": "Haus", "strasse": "Weg", "hausnummer": "2", "plz": "88131", "ort": "Lindau",
            "objektart": "EFH", "nutzung": "EIGEN", "weg_anteil": "12.5", "weg_nenner": 100,
        }, format="json")  # fmt: skip

        self.assertEqual(antwort.status_code, 201)
        self.assertIsNone(Mietobjekt.objects.get(pk=antwort.json()["id"]).weg_anteil)

    def test_anteil_allein_aendern_nutzt_den_gespeicherten_nenner(self):
        self.assertEqual(self.patch(weg_anteil="60").status_code, 200)
        self.assertEqual(self.patch(weg_nenner=None).status_code, 400)


class EinheitLoeschenTests(ApiTestCase):
    def loeschen(self, einheit):
        return self.client.delete(f"/api/einheiten/{einheit.id}/")

    def test_einheit_mit_vertrag_wird_nicht_geloescht(self):
        einheit = self.vertrag.einheit
        self.objekt.einheiten.create(name="Zweite")

        antwort = self.loeschen(einheit)

        self.assertEqual(antwort.status_code, 400)
        self.assertEqual(antwort.json()["detail"], "Einheit hat Mietverträge und kann nicht gelöscht werden.")
        self.assertTrue(Einheit.objects.filter(pk=einheit.pk).exists())

    def test_einzige_einheit_bei_vermietung_im_ganzen_bleibt(self):
        einheit = self.objekt.einheiten.create(name="Gesamt")
        andere = mietobjekt(self.user)  # vermietung GANZ
        einzige = andere.einheiten.create(name="Gesamt")

        self.assertEqual(self.loeschen(einzige).status_code, 400)
        # With another Einheit beside it, an Einheit without contracts can go.
        self.assertEqual(self.loeschen(einheit).status_code, 204)

    def test_hat_vertraege_und_umbenennen(self):
        frei = self.objekt.einheiten.create(name="Frei")

        antwort = self.client.patch(f"/api/einheiten/{frei.id}/", {"name": "Neu"}, format="json")

        self.assertEqual(
            antwort.json(), {"id": frei.id, "mietobjekt": self.objekt.id, "name": "Neu", "hat_vertraege": False}
        )
        liste = {e["id"]: e["hat_vertraege"] for e in self.client.get("/api/einheiten/").json()}
        self.assertTrue(liste[self.vertrag.einheit_id])
