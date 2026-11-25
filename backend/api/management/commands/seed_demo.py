import calendar
from datetime import date, timedelta
from decimal import Decimal as D

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from ...models import (
    Anschaffungskosten,
    Bodenrichtwert,
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

MONATE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]  # fmt: skip

# Keyed so that Einheiten, Darlehen, Verträge and Anteile can refer to them. bild: the photos in frontend/public/images/.
MIETOBJEKTE = {
    "berlin": dict(
        name="Altbau Prenzlauer Berg", farbe=Mietobjekt.Farbe.BLAU, bild="/images/property-0.webp",
        strasse="Kollwitzstraße", hausnummer="42", plz="10405", ort="Berlin",
        objektart="ETW", nutzung="VERMIETUNG", vermietung="GANZ",
        kaufdatum=date(2019, 4, 1), kaufpreis=D("429000"), grundschuld=D("340000"), marktwert=D("498000"),
        wohnflaeche=D("78.50"), grundstuecksflaeche=D("1240"), stockwerk=2, baujahr=1905,
        weg_anteil=D("31.40"), weg_nenner=1000,
        zimmer=3, baeder=1, kueche=1, balkon=1, terrasse=0, keller=1,
        garage=0, tiefgarage=0, carport=0, stellplatz=0,
    ),
    "hamburg": dict(
        name="Wohnhaus Eimsbüttel", farbe=Mietobjekt.Farbe.ORANGE, bild="/images/property-2.webp",
        strasse="Osterstraße", hausnummer="76", plz="20259", ort="Hamburg",
        objektart="MFH", nutzung="VERMIETUNG", vermietung="TEILE",
        kaufdatum=date(2017, 9, 15), kaufpreis=D("1150000"), grundschuld=D("950000"), marktwert=D("1480000"),
        wohnflaeche=D("312"), grundstuecksflaeche=D("430"), baujahr=1965,
        # The whole building belongs to the owner.
        weg_anteil=D("1000"), weg_nenner=1000,
        zimmer=12, baeder=4, kueche=4, balkon=4, terrasse=1, keller=4,
        garage=0, tiefgarage=0, carport=0, stellplatz=2,
    ),
    "potsdam": dict(
        name="Stadtvilla Potsdam", farbe=Mietobjekt.Farbe.GRUEN, bild="/images/property-1.webp",
        strasse="Lindenallee", hausnummer="18", plz="14469", ort="Potsdam",
        objektart="EFH", nutzung="EIGEN",
        kaufdatum=date(2015, 3, 20), kaufpreis=D("640000"), marktwert=D("890000"),
        wohnflaeche=D("165"), grundstuecksflaeche=D("620"), baujahr=2012,
        zimmer=5, baeder=2, kueche=1, balkon=0, terrasse=1, keller=0,
        garage=1, tiefgarage=0, carport=0, stellplatz=1,
    ),
}  # fmt: skip

EINHEITEN = {
    "berlin": ["Gesamt"],
    "hamburg": ["Whg EG links", "Whg EG rechts", "Whg 1. OG", "Whg DG"],
}

# €/m², as of 1 January of the year (the Gutachterausschüsse publish every two years).
BODENRICHTWERTE = {
    "berlin": [(2020, "2800"), (2022, "3400"), (2024, "3600")],
    "hamburg": [(2020, "1250"), (2022, "1500"), (2024, "1450")],
    "potsdam": [(2020, "450"), (2022, "600"), (2024, "580")],
}

# The Kaufpreis is on the Mietobjekt. Grunderwerbsteuer, Notar (1.5 %) and Makler as percentages of it, by state and
# year; anteil_grund_boden is the plot area (WEG share for flats) times about the Bodenrichtwert at the Kaufdatum.
ANSCHAFFUNGSKOSTEN = {
    "berlin": dict(
        # Berlin 2019: Grunderwerbsteuer 6 %, Makler 3.57 %.
        gebuehren=D("1716"), vormerkung=D("429"), grundbuchauszug=D("20"), grunderwerbsteuer=D("25740"),
        notarkosten=D("6435"), maklerprovision=D("15315.30"),
        abzug_instandhaltungsruecklage=D("4200"), abzug_inventar=D("3500"),
        # 1240 m² * 31.40/1000 * 2600 €/m²
        anteil_grund_boden=D("101200"),
    ),
    "hamburg": dict(
        # Hamburg 2017: Grunderwerbsteuer 4.5 %, Makler 6.25 %.
        gebuehren=D("3450"), vormerkung=D("862.50"), grundbuchauszug=D("20"), grunderwerbsteuer=D("51750"),
        notarkosten=D("17250"), maklerprovision=D("71875"),
        # Built 1965: heating, windows and wiring renewed right after the purchase.
        elektro=D("9600"), fenster=D("24800"), heizung=D("18500"), sanitaer=D("14200"), maler=D("6400"),
        bodenbelaege=D("8900"),
        erschliessung=D("3850"),
        # 430 m² * 1000 €/m²
        anteil_grund_boden=D("430000"),
    ),
    "potsdam": dict(
        # Brandenburg 2015: Grunderwerbsteuer 5 %, Makler 7.14 %.
        gebuehren=D("1920"), vormerkung=D("320"), grundbuchauszug=D("20"), grunderwerbsteuer=D("32000"),
        notarkosten=D("9600"), maklerprovision=D("45696"),
        abzug_inventar=D("2500"),
        # 620 m² * 320 €/m²
        anteil_grund_boden=D("198400"),
    ),
}  # fmt: skip

DARLEHEN = [
    dict(
        mietobjekt="berlin", bank="Berliner Volksbank", iban="DE21 1009 0000 2345 6789 01",
        beginn=date(2019, 4, 1), betrag=D("340000"), art="ANNUITAET", zinsbindung_bis=date(2029, 4, 1),
        # 1.65 % Zins + 2 % Tilgung
        sollzins=D("1.650"), monatsbetrag=D("1034.17"),
    ),
    dict(
        mietobjekt="hamburg", bank="Hamburger Sparkasse", iban="DE86 2005 0550 1090 2233 44",
        beginn=date(2017, 9, 15), betrag=D("900000"), art="TILGUNG", zinsbindung_bis=date(2027, 9, 15),
        # Repaid in 40 years.
        sollzins=D("1.200"), monatsbetrag=D("1875.00"),
    ),
]  # fmt: skip

# (Mieter, Mietvertrag), the Vertrag's einheit as (Mietobjekt key, Einheit name).
VERTRAEGE = [
    (
        dict(vorname="Anna", nachname="Schmidt", strasse="Kollwitzstraße", hausnummer="42", plz="10405", ort="Berlin",
             telefon="0170 1234567", email="anna.schmidt@example.de", geburtsdatum=date(1988, 2, 14),
             kontoinhaber="Anna Schmidt", iban="DE89 3704 0044 0532 0130 00"),
        dict(einheit=("berlin", "Gesamt"), beginn=date(2021, 5, 1),
             kaltmiete=D("1250"), nebenkosten=D("210"), kaution=D("3750")),
    ),
    (
        dict(vorname="Mehmet", nachname="Yılmaz", strasse="Osterstraße", hausnummer="76", plz="20259", ort="Hamburg",
             telefon="040 9876543", email="m.yilmaz@example.de", geburtsdatum=date(1979, 7, 3),
             kontoinhaber="Mehmet und Ayşe Yılmaz", iban="DE02 1203 0000 0000 2020 51"),
        dict(einheit=("hamburg", "Whg EG links"), beginn=date(2020, 1, 1),
             kaltmiete=D("1150"), nebenkosten=D("260"), kaution=D("3450")),
    ),
    (
        dict(vorname="Julia", nachname="Becker", strasse="Osterstraße", hausnummer="76", plz="20259", ort="Hamburg",
             telefon="0152 5550123", email="julia.becker@example.de",
             kontoinhaber="Julia Becker", iban="DE12 5001 0517 0648 4898 90"),
        dict(einheit=("hamburg", "Whg EG rechts"), beginn=date(2023, 3, 15), ende=date(2026, 12, 31),
             kaltmiete=D("1090"), nebenkosten=D("250"), kaution=D("3270")),
    ),
    (
        dict(vorname="Sophie", nachname="Wagner", strasse="Hauptstraße", hausnummer="88", plz="01067", ort="Dresden",
             telefon="0176 4443322", email="sophie.wagner@example.de", geburtsdatum=date(1995, 5, 9),
             kontoinhaber="Sophie Wagner", iban="DE75 5121 0800 1245 1261 99"),
        dict(einheit=("hamburg", "Whg 1. OG"), beginn=date(2026, 11, 1),
             kaltmiete=D("1210"), nebenkosten=D("270"), kaution=D("3630")),
    ),
    (
        dict(vorname="Felix", nachname="Hoffmann", strasse="Mariahilfer Straße", hausnummer="101", plz="1060",
             ort="Wien", land="AT", telefon="+43 660 5120934", email="felix.hoffmann@example.at",
             kontoinhaber="Felix Hoffmann", iban="DE88 2004 1111 0004 4712 30"),
        dict(einheit=("hamburg", "Whg DG"), beginn=date(2027, 1, 1),
             kaltmiete=D("1020"), nebenkosten=D("240"), kaution=D("3060")),
    ),
    (
        dict(vorname="Lukas", nachname="Weber", strasse="Bergmannstraße", hausnummer="41", plz="10961", ort="Berlin",
             telefon="030 1112223", email="lukas.weber@example.de",
             kontoinhaber="Lukas Weber", iban="DE77 1001 0010 0123 4567 89"),
        dict(einheit=("berlin", "Gesamt"), beginn=date(2019, 6, 1), ende=date(2021, 4, 30),
             kaltmiete=D("1150"), nebenkosten=D("200"), kaution=D("3450")),
    ),
    (
        dict(vorname="Thomas", nachname="Müller", strasse="Heußweg", hausnummer="12", plz="20255",
             ort="Hamburg", telefon="040 2223334", email="thomas.mueller@example.de", geburtsdatum=date(1962, 1, 22),
             kontoinhaber="Thomas Müller", iban="DE57 8602 0500 0005 5240 01"),
        dict(einheit=("hamburg", "Whg 1. OG"), beginn=date(2018, 8, 1), ende=date(2026, 9, 30),
             kaltmiete=D("1100"), nebenkosten=D("250"), kaution=D("3300")),
    ),
]  # fmt: skip

KOSTENARTEN = [
    dict(name="Telefon/Internet", kategorie="SONSTIGE"),
    dict(name="Allgemeinstrom", kategorie="SONSTIGE"),
    dict(name="Verwaltungskosten", kategorie="SONSTIGE"),
    dict(name="Gebäudeversicherung", kategorie="SONSTIGE"),
    dict(name="Reparaturen", kategorie="INSTANDHALTUNG"),
    dict(name="Malerarbeiten", kategorie="INSTANDHALTUNG"),
    dict(name="Einbauküche", kategorie="ABSCHREIBUNG", abschreibung_prozent=D("10")),
]

# Keyed by the name used in Buchungen (firmenname, or "vorname nachname").
LIEFERANTEN = {
    "Telekom Deutschland GmbH": dict(
        firmenname="Telekom Deutschland GmbH", vorname="Sabine", nachname="Krüger",
        strasse="Landgrabenweg", hausnummer="151", plz="53227", ort="Bonn", land="DE",
        email="geschaeftskunden@telekom.example", telefon="0228 4410273",
    ),
    "Hamburg Energie GmbH": dict(
        firmenname="Hamburg Energie GmbH", vorname="Markus", nachname="Engel",
        strasse="Billhorner Deich", hausnummer="2", plz="20539", ort="Hamburg", land="DE",
        email="kundenservice@hamburgenergie.example", telefon="040 5996014",
    ),
    "Sanitär Huber GmbH": dict(
        firmenname="Sanitär Huber GmbH", vorname="Stefan", nachname="Huber",
        strasse="Fruchtallee", hausnummer="14", plz="20259", ort="Hamburg", land="DE",
        email="info@sanitaer-huber.example", telefon="040 6667788",
    ),
    "Klaus Neumann": dict(
        vorname="Klaus", nachname="Neumann",
        strasse="Boxhagener Straße", hausnummer="63", plz="10245", ort="Berlin", land="DE",
        email="klaus.neumann@malermeister-neumann.example", telefon="0171 2223344",
    ),
    "Hausverwaltung Meier & Partner": dict(
        firmenname="Hausverwaltung Meier & Partner", vorname="Claudia", nachname="Meier",
        strasse="Grindelallee", hausnummer="9", plz="20146", ort="Hamburg", land="DE",
        email="buchhaltung@hv-meier.example", telefon="040 2589340",
    ),
    "Küchenstudio Brandt": dict(
        firmenname="Küchenstudio Brandt", vorname="Jan", nachname="Brandt",
        strasse="Eppendorfer Weg", hausnummer="88", plz="20259", ort="Hamburg", land="DE",
        email="kontakt@kuechenstudio-brandt.example", telefon="040 7704152",
    ),
    "Elektro Vogt": dict(
        firmenname="Elektro Vogt", vorname="Martin", nachname="Vogt",
        strasse="Methfesselstraße", hausnummer="47", plz="20257", ort="Hamburg", land="DE",
        email="service@elektro-vogt.example", telefon="040 3381906",
    ),
    "Hanse Versicherung AG": dict(
        firmenname="Hanse Versicherung AG", vorname="Tobias", nachname="Petersen",
        strasse="Am Sandtorkai", hausnummer="1", plz="20457", ort="Hamburg", land="DE",
        email="schaden-service@hanse-versicherung.example", telefon="040 3006218",
    ),
}  # fmt: skip

def plus_monate(tag, n):
    jahr, monat = divmod(tag.month - 1 + n, 12)
    return date(tag.year + jahr, monat + 1, 1)


def rechnungen(start):
    """The Rechnungen of the 12 months from start (the 1st of a month), dated and paid within them.

    anteile: {Mietobjekt key: prozent}. bezahlt: (buchungstag, buchungsart, buchungstext), None = still open.
    The open ones are in the last month. samples/demo_umsaetze.csv has the Telekom and Huber payments for live
    assignment (the Huber one is also seeded as an open Buchung of the current month); the two Elektro Vogt ones
    are paid together by one Buchung of the current month.
    """
    liste = []
    for n in range(12):
        erster = plus_monate(start, n)
        monat = f"{MONATE[erster.month - 1]} {erster.year}"
        letzter = n == 11
        liste.append(
            dict(lieferant="Telekom Deutschland GmbH", kostenart="Telefon/Internet", datum=erster,
                 name=f"MagentaZuhause {monat}", rechnungsnummer=f"T-{erster:%Y-%m}", betrag=D("29.99"),
                 anteile={"hamburg": 100},
                 bezahlt=None if letzter else (
                     erster.replace(day=15), "Lastschrift", "Kundennr. 4711081512 MagentaZuhause M"))
        )  # fmt: skip
        liste.append(
            dict(lieferant="Hamburg Energie GmbH", kostenart="Allgemeinstrom", datum=erster.replace(day=20),
                 name=f"Abschlag Allgemeinstrom {monat}", rechnungsnummer=f"SW-300112233-{erster:%Y-%m}",
                 betrag=D("85"), anteile={"hamburg": 100},
                 bezahlt=(erster.replace(day=28), "Lastschrift", "Abschlag Strom Vertragskonto 300112233"))
        )  # fmt: skip
        if erster.month in (1, 4, 7, 10):
            quartal = f"Q{(erster.month + 2) // 3}/{erster.year}"
            liste.append(
                dict(lieferant="Hausverwaltung Meier & Partner", kostenart="Verwaltungskosten", datum=erster,
                     name=f"Verwaltung {quartal}", rechnungsnummer=f"HV-{erster:%Y-%m}", betrag=D("357"),
                     anteile={"hamburg": 60, "berlin": 40},
                     bezahlt=(erster.replace(day=10), "Überweisung",
                              f"Rechnung HV-{erster:%Y-%m} Verwaltung {quartal}"))
            )  # fmt: skip
        if erster.month == 1:
            liste.append(
                dict(lieferant="Hanse Versicherung AG", kostenart="Gebäudeversicherung", datum=erster.replace(day=15),
                     name=f"Gebäudeversicherung {erster.year}", rechnungsnummer=f"HV-88213-{erster:%y}",
                     betrag=D("480"), anteile={"hamburg": 70, "berlin": 30},
                     bezahlt=(erster.replace(day=30), "Lastschrift",
                              f"Vers.-Nr. 88213 Gebäudeversicherung {erster.year}"))
            )  # fmt: skip

    kueche, maler, heizung = plus_monate(start, 1), plus_monate(start, 8), plus_monate(start, 11)
    liste += [
        dict(lieferant="Küchenstudio Brandt", kostenart="Einbauküche", datum=kueche.replace(day=10),
             name="Einbauküche Whg DG", rechnungsnummer="KS-4471", betrag=D("6800"), anteile={"hamburg": 100},
             bezahlt=(kueche.replace(day=25), "Überweisung", "Rechnung KS-4471 Einbauküche Osterstraße 76")),
        dict(lieferant="Klaus Neumann", kostenart="Malerarbeiten", datum=maler.replace(day=20),
             name="Treppenhaus streichen", rechnungsnummer="N-117", betrag=D("1250"), anteile={"berlin": 100},
             bezahlt=(maler.replace(day=28), "Überweisung", "Rechnung N-117 Treppenhaus streichen")),
        # Rechnungsnummer is the date, e.g. "2026-0915", as in samples/demo_umsaetze.csv.
        dict(lieferant="Sanitär Huber GmbH", kostenart="Reparaturen", datum=heizung.replace(day=15),
             name="Reparatur Heizung", rechnungsnummer=f"{heizung:%Y-%m}15", betrag=D("412.50"),
             anteile={"hamburg": 100}, bezahlt=None),
        dict(lieferant="Elektro Vogt", kostenart="Reparaturen", datum=heizung.replace(day=18),
             name="Reparatur Gegensprechanlage", rechnungsnummer="EV-2061", betrag=D("189"),
             anteile={"hamburg": 100}, bezahlt=None),
        dict(lieferant="Elektro Vogt", kostenart="Reparaturen", datum=heizung.replace(day=22),
             name="Reparatur Treppenhausbeleuchtung", rechnungsnummer="EV-2074", betrag=D("145"),
             anteile={"berlin": 100}, bezahlt=None),
    ]  # fmt: skip
    return liste


class Command(BaseCommand):
    help = (
        "Ersetzt alle Daten des Benutzers (Mietobjekte, Mieter, Rechnungen, Buchungen, ...) durch Demodaten. "
        "Mieten, Rechnungen und Darlehensraten werden für die letzten 12 vollen Monate erzeugt."
    )

    def add_arguments(self, parser):
        parser.add_argument("--user", required=True, help="Benutzername, dem die Demodaten gehören.")

    def handle(self, *args, **options):
        try:
            user = get_user_model().objects.get(username=options["user"])
        except get_user_model().DoesNotExist:
            raise CommandError(f'Benutzer "{options["user"]}" existiert nicht. Bitte zuerst anlegen (createsuperuser).')

        with transaction.atomic():
            self.loeschen(user)
            self.anlegen(user)

        self.stdout.write(
            self.style.SUCCESS(
                f"Demodaten für {user.username} angelegt: {Mietobjekt.objects.filter(eigentuemer=user).count()} "
                f"Mietobjekte, {Mietvertrag.objects.filter(mieter__eigentuemer=user).count()} Mietverträge, "
                f"{Rechnung.objects.filter(lieferant__eigentuemer=user).count()} Rechnungen, "
                f"{Buchung.objects.filter(eigentuemer=user).count()} Buchungen."
            )
        )

    def loeschen(self, user):
        # In this order because of the PROTECT foreign keys; deleting Buchungen also deletes their Zuordnungen.
        Buchung.objects.filter(eigentuemer=user).delete()
        Mietvertrag.objects.filter(mieter__eigentuemer=user).delete()
        Mieter.objects.filter(eigentuemer=user).delete()
        Rechnung.objects.filter(lieferant__eigentuemer=user).delete()
        Lieferant.objects.filter(eigentuemer=user).delete()
        Kostenart.objects.filter(eigentuemer=user).delete()
        Mietobjekt.objects.filter(eigentuemer=user).delete()

    def anlegen(self, user):
        mietobjekte = {key: Mietobjekt.objects.create(eigentuemer=user, **daten) for key, daten in MIETOBJEKTE.items()}
        einheiten = {
            (key, name): Einheit.objects.create(mietobjekt=mietobjekte[key], name=name)
            for key, namen in EINHEITEN.items()
            for name in namen
        }
        for key, werte in BODENRICHTWERTE.items():
            for jahr, wert in werte:
                Bodenrichtwert.objects.create(mietobjekt=mietobjekte[key], datum=date(jahr, 1, 1), wert=D(wert))
        for key, daten in ANSCHAFFUNGSKOSTEN.items():
            Anschaffungskosten.objects.create(mietobjekt=mietobjekte[key], **daten)
        darlehen = [
            Darlehen.objects.create(**{**daten, "mietobjekt": mietobjekte[daten["mietobjekt"]]}) for daten in DARLEHEN
        ]

        vertraege = [
            Mietvertrag.objects.create(
                mieter=Mieter.objects.create(eigentuemer=user, **mieter),
                **{**vertrag, "einheit": einheiten[vertrag["einheit"]]},
            )
            for mieter, vertrag in VERTRAEGE
        ]

        kostenarten = {k["name"]: Kostenart.objects.create(eigentuemer=user, **k) for k in KOSTENARTEN}
        lieferanten = {name: Lieferant.objects.create(eigentuemer=user, **daten) for name, daten in LIEFERANTEN.items()}

        # The 12 full months before the current one, all assigned. The current month only gets the open Buchungen
        # below; the rest of it is left for samples/demo_umsaetze.csv.
        dieser_monat = timezone.localdate().replace(day=1)
        start, ende = plus_monate(dieser_monat, -12), dieser_monat - timedelta(days=1)

        offene_rechnungen = {}
        for daten in rechnungen(start):
            rechnung = Rechnung.objects.create(
                lieferant=lieferanten[daten["lieferant"]],
                kostenart=kostenarten[daten["kostenart"]],
                **{k: daten[k] for k in ("datum", "name", "rechnungsnummer", "betrag")},
            )
            for key, prozent in daten["anteile"].items():
                RechnungsAnteil.objects.create(rechnung=rechnung, mietobjekt=mietobjekte[key], prozent=prozent)
            if daten["bezahlt"]:
                tag, art, text = daten["bezahlt"]
                self.buchen(user, tag, daten["lieferant"], text, art, -rechnung.betrag, rechnung=rechnung)
            else:
                offene_rechnungen[daten["name"]] = rechnung

        # Rent for every month, from every contract that ran in that month.
        for n in range(12):
            erster = plus_monate(start, n)
            letzter = date(erster.year, erster.month, calendar.monthrange(erster.year, erster.month)[1])
            for i, v in enumerate(vertraege):
                if v.beginn > letzter or (v.ende is not None and v.ende < erster):
                    continue
                objekt = v.einheit.mietobjekt
                text = f"Miete {MONATE[erster.month - 1]} {erster.year} {objekt.strasse} {objekt.hausnummer}"
                if v.einheit.name != "Gesamt":
                    text += f" {v.einheit.name}"
                # Tenants pay on slightly different days at the start of the month.
                tag = erster + timedelta(days=i % 3)
                self.buchen(
                    user, tag, v.mieter.kontoinhaber, text, "Überweisung", v.kaltmiete + v.nebenkosten, mietvertrag=v
                )

        # Darlehen rates on the dates of the Tilgungsplan, for the amount it plans.
        for d in darlehen:
            for monat in d.tilgungsplan():
                if start <= monat["datum"] <= ende:
                    text = f"Rate {MONATE[monat['datum'].month - 1]} {monat['datum'].year} Darlehen {d.iban[-12:]}"
                    rate = monat["zins"] + monat["tilgung"]
                    self.buchen(user, monat["datum"], d.bank, text, "Lastschrift", -rate, darlehen=d)

        self.offene_buchungen(user, dieser_monat, {v.mieter.nachname: v for v in vertraege}, offene_rechnungen)

    def offene_buchungen(self, user, dieser_monat, vertraege, offene_rechnungen):
        """Buchungen of the current month that are not or only partly assigned, to try out the Zuordnung.

        The rent and Huber rows are the same as in samples/demo_umsaetze.csv, so importing it in that month
        skips them instead of adding them twice.
        """

        def tag(n):
            # Not in the future when seeded early in the month.
            return min(dieser_monat.replace(day=n), timezone.localdate())

        monat = MONATE[dieser_monat.month - 1]
        for v, n, text in [
            (vertraege["Schmidt"], 1, f"Miete {monat} Kollwitzstraße 42"),
            (vertraege["Yılmaz"], 1, f"Miete {dieser_monat:%m/%Y} Whg EG links"),
        ]:
            self.buchen(user, tag(n), v.mieter.kontoinhaber, text, "Überweisung", v.kaltmiete + v.nebenkosten)

        huber = offene_rechnungen["Reparatur Heizung"]
        self.buchen(
            user, tag(6), "Sanitär Huber GmbH", f"Rechnung {huber.rechnungsnummer} {huber.name} Osterstraße 76",
            "Überweisung", -huber.betrag, wertstellung=tag(7),
        )  # fmt: skip
        # No Rechnung for this one.
        self.buchen(
            user, tag(12), "Hanse Versicherung AG",
            f"Vers.-Nr. 90417 Haus- und Grundbesitzerhaftpflicht {dieser_monat.year}/{dieser_monat.year + 1}",
            "Lastschrift", D("-156.80"),
        )  # fmt: skip

        # One transfer for both Elektro Vogt Rechnungen, only assigned to the first so far.
        sprechanlage = offene_rechnungen["Reparatur Gegensprechanlage"]
        beleuchtung = offene_rechnungen["Reparatur Treppenhausbeleuchtung"]
        self.buchen(
            user, tag(9), "Elektro Vogt",
            f"Rechnungen {sprechanlage.rechnungsnummer} und {beleuchtung.rechnungsnummer}",
            "Überweisung", -(sprechanlage.betrag + beleuchtung.betrag), zugeordnet=sprechanlage.betrag, rechnung=sprechanlage,
        )  # fmt: skip

    def buchen(self, user, tag, kontoinhaber, text, art, betrag, wertstellung=None, zugeordnet=None, **ziel):
        """Assigned to ziel (only the amount zugeordnet, if given); without ziel the Buchung stays open."""
        buchung = Buchung.objects.create(
            eigentuemer=user,
            buchungstag=tag,
            wertstellung=wertstellung or tag,
            kontoinhaber=kontoinhaber,
            buchungstext=text,
            buchungsart=art,
            betrag=betrag,
        )
        if ziel:
            Zuordnung.objects.create(buchung=buchung, betrag=zugeordnet or abs(betrag), **ziel)
