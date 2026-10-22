import calendar
from datetime import date, timedelta
from decimal import Decimal as D

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from ...models import (
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

# Keyed so that Einheiten, Darlehen, Verträge and Anteile can refer to them.
MIETOBJEKTE = {
    "linden": dict(
        name="Wohnung Lindenstraße", farbe=Mietobjekt.Farbe.BLAU,
        strasse="Lindenstraße", hausnummer="12a", plz="10969", ort="Berlin",
        objektart="ETW", nutzung="VERMIETUNG", vermietung="GANZ",
        kaufdatum=date(2019, 4, 1), kaufpreis=D("285000"), grundschuld=D("230000"), marktwert=D("342000"),
        wohnflaeche=D("78.50"), grundstuecksflaeche=D("1240"), stockwerk=2, baujahr=1998,
        weg_anteil=D("85.40"), weg_nenner=1000,
        zimmer=3, baeder=1, kueche=1, balkon=1, keller=1, stellplatz=1,
    ),
    "garten": dict(
        name="MFH Gartenweg", farbe=Mietobjekt.Farbe.ORANGE,
        strasse="Gartenweg", hausnummer="5", plz="04109", ort="Leipzig",
        objektart="MFH", nutzung="VERMIETUNG", vermietung="TEILE",
        kaufdatum=date(2017, 9, 15), kaufpreis=D("720000"), grundschuld=D("600000"), marktwert=D("690000"),
        wohnflaeche=D("312"), grundstuecksflaeche=D("540"), baujahr=1965,
        zimmer=12, baeder=4, kueche=4, balkon=2, keller=4, garage=2,
    ),
    "wg": dict(
        name="WG Uni-Viertel", farbe=Mietobjekt.Farbe.LILA,
        strasse="Kreuzstraße", hausnummer="31", plz="48143", ort="Münster",
        objektart="ETW", nutzung="VERMIETUNG", vermietung="TEILE",
        kaufdatum=date(2022, 6, 1), kaufpreis=D("210000"),
        wohnflaeche=D("74"), stockwerk=3, baujahr=1972, weg_anteil=D("6.20"), weg_nenner=100,
        zimmer=3, baeder=1, kueche=1,
    ),
    "see": dict(
        name="Eigenheim Seeblick", farbe=Mietobjekt.Farbe.GRUEN,
        strasse="Seestraße", hausnummer="3", plz="78464", ort="Konstanz",
        objektart="EFH", nutzung="EIGEN", kaufdatum=date(2015, 3, 20), kaufpreis=D("495000"),
    ),
}  # fmt: skip

EINHEITEN = {
    "linden": ["Gesamt"],
    "garten": ["Whg EG links", "Whg EG rechts", "Whg 1. OG", "Whg DG"],
    "wg": ["Zimmer 1", "Zimmer 2", "Zimmer 3"],
}

BODENRICHTWERTE = {
    "linden": [(2019, "3200"), (2021, "3800"), (2023, "4400"), (2024, "4200"), (2025, "4350"), (2026, "4600")],
    "garten": [(2017, "95"), (2019, "120"), (2021, "160"), (2023, "210"), (2024, "200"), (2025, "205"), (2026, "215")],
    "wg": [(2023, "780"), (2025, "820")],
}

DARLEHEN = [
    dict(
        mietobjekt="linden", bank="Volksbank Berlin", iban="DE21 1009 0000 2345 6789 01",
        beginn=date(2019, 4, 1), betrag=D("230000"), art="ANNUITAET", zinsbindung_bis=date(2029, 4, 1),
        sollzins=D("1.650"), tilgung=D("2.000"),
    ),
    dict(
        mietobjekt="garten", bank="Sparkasse Leipzig", iban="DE86 8605 5592 1090 2233 44",
        beginn=date(2017, 9, 15), betrag=D("550000"), art="TILGUNG", zinsbindung_bis=date(2027, 9, 15),
        sollzins=D("1.200"), tilgung=D("2.500"),
    ),
]  # fmt: skip

# (Mieter, Mietvertrag), the Vertrag's einheit as (Mietobjekt key, Einheit name).
VERTRAEGE = [
    (
        dict(vorname="Anna", nachname="Schmidt", strasse="Lindenstraße", hausnummer="12a", plz="10969", ort="Berlin",
             telefon="0170 1234567", email="anna.schmidt@example.de", geburtsdatum=date(1988, 2, 14),
             kontoinhaber="Anna Schmidt", iban="DE89 3704 0044 0532 0130 00"),
        dict(einheit=("linden", "Gesamt"), beginn=date(2021, 5, 1),
             kaltmiete=D("950"), nebenkosten=D("180"), kaution=D("2850")),
    ),
    (
        dict(vorname="Mehmet", nachname="Yılmaz", strasse="Gartenweg", hausnummer="5", plz="04109", ort="Leipzig",
             telefon="0341 9876543", email="m.yilmaz@example.de", geburtsdatum=date(1979, 7, 3),
             kontoinhaber="Mehmet und Ayşe Yılmaz", iban="DE02 1203 0000 0000 2020 51"),
        dict(einheit=("garten", "Whg EG links"), beginn=date(2020, 1, 1),
             kaltmiete=D("720"), nebenkosten=D("210"), kaution=D("2160")),
    ),
    (
        dict(vorname="Julia", nachname="Becker", strasse="Gartenweg", hausnummer="5", plz="04109", ort="Leipzig",
             telefon="0152 5550123", email="julia.becker@example.de",
             kontoinhaber="Julia Becker", iban="DE12 5001 0517 0648 4898 90"),
        dict(einheit=("garten", "Whg EG rechts"), beginn=date(2023, 3, 15), ende=date(2026, 12, 31),
             kaltmiete=D("680"), nebenkosten=D("200"), kaution=D("2040")),
    ),
    (
        dict(vorname="Lea", nachname="Fischer", strasse="Kreuzstraße", hausnummer="31", plz="48143", ort="Münster",
             telefon="0157 3014488", email="lea.fischer@example.de", geburtsdatum=date(2004, 11, 30),
             kontoinhaber="Lea Fischer", iban="DE46 4005 0150 0003 3881 20"),
        dict(einheit=("wg", "Zimmer 1"), beginn=date(2025, 10, 1),
             kaltmiete=D("420"), nebenkosten=D("90"), kaution=D("1260")),
    ),
    (
        dict(vorname="Jonas", nachname="Klein", strasse="Kreuzstraße", hausnummer="31", plz="48143", ort="Münster",
             telefon="0162 7781203", email="jonas.klein@example.de",
             kontoinhaber="Jonas Klein", iban="DE57 4006 0265 0007 0124 59"),
        dict(einheit=("wg", "Zimmer 2"), beginn=date(2024, 4, 1), kaltmiete=D("390"), nebenkosten=D("90")),
    ),
    (
        dict(vorname="Sophie", nachname="Wagner", strasse="Hauptstraße", hausnummer="88", plz="01067", ort="Dresden",
             telefon="0176 4443322", email="sophie.wagner@example.de", geburtsdatum=date(1995, 5, 9),
             kontoinhaber="Sophie Wagner", iban="DE75 5121 0800 1245 1261 99"),
        dict(einheit=("garten", "Whg 1. OG"), beginn=date(2026, 11, 1),
             kaltmiete=D("760"), nebenkosten=D("220"), kaution=D("2280")),
    ),
    (
        dict(vorname="Felix", nachname="Hoffmann", strasse="Mariahilfer Straße", hausnummer="101", plz="1060",
             ort="Wien", land="AT", telefon="+43 660 5120934", email="felix.hoffmann@example.at",
             kontoinhaber="Felix Hoffmann", iban="DE88 2004 1111 0004 4712 30"),
        dict(einheit=("garten", "Whg DG"), beginn=date(2027, 1, 1),
             kaltmiete=D("640"), nebenkosten=D("190"), kaution=D("1920")),
    ),
    (
        dict(vorname="Lukas", nachname="Weber", strasse="Bergmannstraße", hausnummer="41", plz="10961", ort="Berlin",
             telefon="030 1112223", email="lukas.weber@example.de",
             kontoinhaber="Lukas Weber", iban="DE77 1001 0010 0123 4567 89"),
        dict(einheit=("linden", "Gesamt"), beginn=date(2019, 6, 1), ende=date(2021, 4, 30),
             kaltmiete=D("900"), nebenkosten=D("170"), kaution=D("2700")),
    ),
    (
        dict(vorname="Thomas", nachname="Müller", strasse="Karl-Heine-Straße", hausnummer="22", plz="04229",
             ort="Leipzig", telefon="0341 2223334", email="thomas.mueller@example.de", geburtsdatum=date(1962, 1, 22),
             kontoinhaber="Thomas Müller", iban="DE57 8602 0500 0005 5240 01"),
        dict(einheit=("garten", "Whg 1. OG"), beginn=date(2018, 8, 1), ende=date(2026, 9, 30),
             kaltmiete=D("700"), nebenkosten=D("200"), kaution=D("2100")),
    ),
    (
        dict(vorname="Marie", nachname="Schulz", strasse="Hammer Straße", hausnummer="117", plz="48153", ort="Münster",
             telefon="0151 6620417", email="marie.schulz@example.de",
             kontoinhaber="Marie Schulz", iban="DE22 4005 0150 0009 1835 26"),
        dict(einheit=("wg", "Zimmer 3"), beginn=date(2022, 10, 1), ende=date(2025, 9, 30),
             kaltmiete=D("380"), nebenkosten=D("85"), kaution=D("1140")),
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
    "Stadtwerke Karlsruhe": dict(
        firmenname="Stadtwerke Karlsruhe", vorname="Markus", nachname="Engel",
        strasse="Daxlander Straße", hausnummer="72", plz="76185", ort="Karlsruhe", land="DE",
        email="kundenservice@stadtwerke-karlsruhe.example", telefon="0721 5996014",
    ),
    "Sanitär Huber GmbH": dict(
        firmenname="Sanitär Huber GmbH", vorname="Stefan", nachname="Huber",
        strasse="Eisenbahnstraße", hausnummer="14", plz="04315", ort="Leipzig", land="DE",
        email="info@sanitaer-huber.example", telefon="0341 6667788",
    ),
    "Klaus Neumann": dict(
        vorname="Klaus", nachname="Neumann",
        strasse="Boxhagener Straße", hausnummer="63", plz="10245", ort="Berlin", land="DE",
        email="klaus.neumann@malermeister-neumann.example", telefon="0171 2223344",
    ),
    "Hausverwaltung Meier & Partner": dict(
        firmenname="Hausverwaltung Meier & Partner", vorname="Claudia", nachname="Meier",
        strasse="Karl-Liebknecht-Straße", hausnummer="9", plz="04107", ort="Leipzig", land="DE",
        email="buchhaltung@hv-meier.example", telefon="0341 2589340",
    ),
    "Küchenstudio Brandt": dict(
        firmenname="Küchenstudio Brandt", vorname="Jan", nachname="Brandt",
        strasse="Hammer Straße", hausnummer="214", plz="48153", ort="Münster", land="DE",
        email="kontakt@kuechenstudio-brandt.example", telefon="0251 7704152",
    ),
    "Hanse Versicherung AG": dict(
        firmenname="Hanse Versicherung AG", vorname="Tobias", nachname="Petersen",
        strasse="Am Sandtorkai", hausnummer="1", plz="20457", ort="Hamburg", land="DE",
        email="schaden-service@hanse-versicherung.example", telefon="040 3006218",
    ),
}  # fmt: skip

# anteile: {Mietobjekt key: prozent}. bezahlt: (buchungstag, buchungsart, buchungstext), None = still open.
# T-2026-10 and 2026-0915 stay open; samples/demo_umsaetze.csv has their payments for live assignment.
RECHNUNGEN = [
    dict(lieferant="Telekom Deutschland GmbH", kostenart="Telefon/Internet", datum=date(2026, 8, 1),
         name="MagentaZuhause August", rechnungsnummer="T-2026-08", betrag=D("29.99"), anteile={"wg": 100},
         bezahlt=(date(2026, 8, 17), "Lastschrift", "Kundennr. 4711081512 MagentaZuhause M")),
    dict(lieferant="Telekom Deutschland GmbH", kostenart="Telefon/Internet", datum=date(2026, 9, 1),
         name="MagentaZuhause September", rechnungsnummer="T-2026-09", betrag=D("29.99"), anteile={"wg": 100},
         bezahlt=(date(2026, 9, 15), "Lastschrift", "Kundennr. 4711081512 MagentaZuhause M")),
    dict(lieferant="Telekom Deutschland GmbH", kostenart="Telefon/Internet", datum=date(2026, 10, 1),
         name="MagentaZuhause Oktober", rechnungsnummer="T-2026-10", betrag=D("29.99"), anteile={"wg": 100},
         bezahlt=None),
    dict(lieferant="Stadtwerke Karlsruhe", kostenart="Allgemeinstrom", datum=date(2026, 8, 20),
         name="Abschlag Allgemeinstrom August", rechnungsnummer="SW-300112233-08", betrag=D("85"),
         anteile={"garten": 100},
         bezahlt=(date(2026, 8, 28), "Lastschrift", "Abschlag Strom Vertragskonto 300112233")),
    dict(lieferant="Stadtwerke Karlsruhe", kostenart="Allgemeinstrom", datum=date(2026, 9, 20),
         name="Abschlag Allgemeinstrom September", rechnungsnummer="SW-300112233-09", betrag=D("85"),
         anteile={"garten": 100},
         bezahlt=(date(2026, 9, 29), "Lastschrift", "Abschlag Strom Vertragskonto 300112233")),
    dict(lieferant="Sanitär Huber GmbH", kostenart="Reparaturen", datum=date(2026, 9, 15),
         name="Reparatur Heizung", rechnungsnummer="2026-0915", betrag=D("412.50"), anteile={"garten": 100},
         bezahlt=None),
    dict(lieferant="Klaus Neumann", kostenart="Malerarbeiten", datum=date(2026, 6, 20),
         name="Treppenhaus streichen", rechnungsnummer="N-117", betrag=D("1250"), anteile={"linden": 100},
         bezahlt=(date(2026, 6, 29), "Überweisung", "Rechnung N-117 Treppenhaus streichen")),
    dict(lieferant="Hausverwaltung Meier & Partner", kostenart="Verwaltungskosten", datum=date(2026, 7, 1),
         name="Verwaltung Q3/2026", rechnungsnummer="HV-2026-07", betrag=D("357"), anteile={"garten": 60, "linden": 40},
         bezahlt=(date(2026, 7, 10), "Überweisung", "Rechnung HV-2026-07 Verwaltung Q3/2026")),
    dict(lieferant="Küchenstudio Brandt", kostenart="Einbauküche", datum=date(2024, 3, 10),
         name="Einbauküche WG", rechnungsnummer="KS-4471", betrag=D("6800"), anteile={"wg": 100},
         bezahlt=(date(2024, 3, 25), "Überweisung", "Rechnung KS-4471 Einbauküche Kreuzstraße 31")),
    dict(lieferant="Hanse Versicherung AG", kostenart="Gebäudeversicherung", datum=date(2025, 1, 15),
         name="Gebäudeversicherung 2025", rechnungsnummer="HV-88213-25", betrag=D("460"),
         anteile={"garten": 70, "linden": 30},
         bezahlt=(date(2025, 1, 31), "Lastschrift", "Vers.-Nr. 88213 Gebäudeversicherung 2025")),
    dict(lieferant="Hanse Versicherung AG", kostenart="Gebäudeversicherung", datum=date(2026, 1, 15),
         name="Gebäudeversicherung 2026", rechnungsnummer="HV-88213-26", betrag=D("480"),
         anteile={"garten": 70, "linden": 30},
         bezahlt=(date(2026, 1, 30), "Lastschrift", "Vers.-Nr. 88213 Gebäudeversicherung 2026")),
]  # fmt: skip


def plus_monate(tag, n):
    jahr, monat = divmod(tag.month - 1 + n, 12)
    return date(tag.year + jahr, monat + 1, 1)


class Command(BaseCommand):
    help = (
        "Ersetzt alle Daten des Benutzers (Mietobjekte, Mieter, Rechnungen, Buchungen, ...) durch Demodaten. "
        "Mietzahlungen werden für die letzten 4 vollen Monate erzeugt."
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
        for daten in DARLEHEN:
            Darlehen.objects.create(**{**daten, "mietobjekt": mietobjekte[daten["mietobjekt"]]})

        vertraege = [
            Mietvertrag.objects.create(
                mieter=Mieter.objects.create(eigentuemer=user, **mieter),
                **{**vertrag, "einheit": einheiten[vertrag["einheit"]]},
            )
            for mieter, vertrag in VERTRAEGE
        ]

        kostenarten = {k["name"]: Kostenart.objects.create(eigentuemer=user, **k) for k in KOSTENARTEN}
        lieferanten = {name: Lieferant.objects.create(eigentuemer=user, **daten) for name, daten in LIEFERANTEN.items()}
        for daten in RECHNUNGEN:
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

        # Rent for the last 4 full months, from every contract that ran in that month.
        dieser_monat = timezone.localdate().replace(day=1)
        for n in range(-4, 0):
            erster = plus_monate(dieser_monat, n)
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

    def buchen(self, user, tag, kontoinhaber, text, art, betrag, **ziel):
        buchung = Buchung.objects.create(
            eigentuemer=user,
            buchungstag=tag,
            wertstellung=tag,
            kontoinhaber=kontoinhaber,
            buchungstext=text,
            buchungsart=art,
            betrag=betrag,
        )
        Zuordnung.objects.create(buchung=buchung, betrag=abs(betrag), **ziel)
