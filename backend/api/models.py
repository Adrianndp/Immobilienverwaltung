import calendar
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Mietobjekt(models.Model):
    class Objektart(models.TextChoices):
        ETW = "ETW", "Eigentumswohnung"
        EFH = "EFH", "Einfamilienhaus"
        MFH = "MFH", "Mehrfamilienhaus"
        GEW = "GEW", "Gewerbe"
        SON = "SON", "Sonstiges"

    class Nutzung(models.TextChoices):
        EIGEN = "EIGEN", "Eigennutzung"
        VERMIETUNG = "VERMIETUNG", "Vermietung"

    class Vermietung(models.TextChoices):
        GANZ = "GANZ", "Vermietung im Ganzen"
        TEILE = "TEILE", "Vermietung in Teilen (WG)"

    class Farbe(models.TextChoices):
        BLAU = "#1976D2", "Blau"
        ORANGE = "#ED6C02", "Orange"
        LILA = "#9C27B0", "Lila"
        GRUEN = "#2E7D32", "Grün"
        ROT = "#D32F2F", "Rot"
        TUERKIS = "#0097A7", "Türkis"
        BRAUN = "#795548", "Braun"
        GRAU = "#616161", "Grau"

    eigentuemer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    farbe = models.CharField(max_length=7, choices=Farbe.choices, default=Farbe.BLAU)
    strasse = models.CharField(max_length=100)
    hausnummer = models.CharField(max_length=10)
    plz = models.CharField(max_length=5)
    ort = models.CharField(max_length=100)
    land = models.CharField(max_length=2, default="DE")
    objektart = models.CharField(max_length=3, choices=Objektart.choices)
    nutzung = models.CharField(max_length=10, choices=Nutzung.choices)
    vermietung = models.CharField(max_length=5, choices=Vermietung.choices, blank=True)
    kaufdatum = models.DateField(null=True, blank=True)
    kaufpreis = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    grundschuld = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    marktwert = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    wohnflaeche = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    grundstuecksflaeche = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stockwerk = models.SmallIntegerField(null=True, blank=True)
    baujahr = models.PositiveSmallIntegerField(null=True, blank=True)
    weg_anteil = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    weg_nenner = models.PositiveSmallIntegerField(
        choices=[(100, "/100"), (1000, "/1000")], null=True, blank=True
    )
    zimmer = models.PositiveSmallIntegerField(default=0)
    baeder = models.PositiveSmallIntegerField(default=0)
    kueche = models.PositiveSmallIntegerField(default=0)
    balkon = models.PositiveSmallIntegerField(default=0)
    terrasse = models.PositiveSmallIntegerField(default=0)
    keller = models.PositiveSmallIntegerField(default=0)
    garage = models.PositiveSmallIntegerField(default=0)
    tiefgarage = models.PositiveSmallIntegerField(default=0)
    carport = models.PositiveSmallIntegerField(default=0)
    stellplatz = models.PositiveSmallIntegerField(default=0)


class Einheit(models.Model):
    mietobjekt = models.ForeignKey(Mietobjekt, on_delete=models.CASCADE, related_name="einheiten")
    name = models.CharField(max_length=100)


class Bodenrichtwert(models.Model):
    mietobjekt = models.ForeignKey(Mietobjekt, on_delete=models.CASCADE, related_name="bodenrichtwerte")
    datum = models.DateField()
    wert = models.DecimalField(max_digits=10, decimal_places=2)


class Darlehen(models.Model):
    class Art(models.TextChoices):
        ANNUITAET = "ANNUITAET", "Annuitätendarlehen"
        TILGUNG = "TILGUNG", "Tilgungsdarlehen"

    mietobjekt = models.ForeignKey(Mietobjekt, on_delete=models.CASCADE, related_name="darlehen")
    bank = models.CharField(max_length=100)
    iban = models.CharField(max_length=34)
    beginn = models.DateField()
    betrag = models.DecimalField(max_digits=12, decimal_places=2)
    art = models.CharField(max_length=9, choices=Art.choices)
    zinsbindung_bis = models.DateField(null=True, blank=True)
    sollzins = models.DecimalField(max_digits=5, decimal_places=3)
    tilgung = models.DecimalField(max_digits=5, decimal_places=3)

    def tilgungsplan(self):
        """Monthly {datum, zins, tilgung, rest}, first payment one month after beginn, until repaid (max. 600 months)."""

        def runden(wert):
            return wert.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        def plus_monate(tag, n):
            jahr, monat = divmod(tag.month - 1 + n, 12)
            jahr, monat = tag.year + jahr, monat + 1
            # 31 Jan + 1 month -> 28/29 Feb
            return date(jahr, monat, min(tag.day, calendar.monthrange(jahr, monat)[1]))

        annuitaet = runden(self.betrag * (self.sollzins + self.tilgung) / 100 / 12)
        tilgung_fest = runden(self.betrag * self.tilgung / 100 / 12)
        rest = self.betrag
        plan = []
        for n in range(1, 601):
            if rest <= 0:
                break
            zins = runden(rest * self.sollzins / 100 / 12)
            tilgung = annuitaet - zins if self.art == self.Art.ANNUITAET else tilgung_fest
            # The last payment only repays what is left.
            tilgung = min(tilgung, rest)
            rest -= tilgung
            plan.append({"datum": plus_monate(self.beginn, n), "zins": zins, "tilgung": tilgung, "rest": rest})
        return plan

    def rate(self):
        plan = self.tilgungsplan()
        return plan[0]["zins"] + plan[0]["tilgung"] if plan else Decimal("0")

    def restschuld(self, stichtag=None):
        stichtag = stichtag or timezone.localdate()
        bisher = [monat for monat in self.tilgungsplan() if monat["datum"] <= stichtag]
        return bisher[-1]["rest"] if bisher else self.betrag

    def zinsen(self, von, bis):
        return sum((monat["zins"] for monat in self.tilgungsplan() if von <= monat["datum"] <= bis), Decimal("0"))


class Mieter(models.Model):
    eigentuemer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    vorname = models.CharField(max_length=100)
    nachname = models.CharField(max_length=100)
    strasse = models.CharField(max_length=100, blank=True)
    hausnummer = models.CharField(max_length=10, blank=True)
    plz = models.CharField(max_length=5, blank=True)
    ort = models.CharField(max_length=100, blank=True)
    land = models.CharField(max_length=2, default="DE")
    telefon = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    geburtsdatum = models.DateField(null=True, blank=True)
    kontoinhaber = models.CharField(max_length=100, blank=True)
    iban = models.CharField(max_length=34, blank=True)


class Mietvertrag(models.Model):
    mieter = models.ForeignKey(Mieter, on_delete=models.PROTECT, related_name="vertraege")
    einheit = models.ForeignKey(Einheit, on_delete=models.PROTECT, related_name="vertraege")
    beginn = models.DateField()
    ende = models.DateField(null=True, blank=True)
    kaltmiete = models.DecimalField(max_digits=12, decimal_places=2)
    nebenkosten = models.DecimalField(max_digits=12, decimal_places=2)
    kaution = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class Kostenart(models.Model):
    class Kategorie(models.TextChoices):
        SONSTIGE = "SONSTIGE", "Sonstige Aufwendungen"
        INSTANDHALTUNG = "INSTANDHALTUNG", "Instandhaltungsaufwendung"
        ABSCHREIBUNG = "ABSCHREIBUNG", "Abschreibung"

    eigentuemer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    kategorie = models.CharField(max_length=14, choices=Kategorie.choices)
    abschreibung_prozent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["eigentuemer", "name"], name="kostenart_eigentuemer_name_unique")
        ]


class Lieferant(models.Model):
    eigentuemer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    firmenname = models.CharField(max_length=100, blank=True)
    vorname = models.CharField(max_length=100, blank=True)
    nachname = models.CharField(max_length=100, blank=True)
    strasse = models.CharField(max_length=100, blank=True)
    hausnummer = models.CharField(max_length=10, blank=True)
    plz = models.CharField(max_length=5, blank=True)
    ort = models.CharField(max_length=100, blank=True)
    land = models.CharField(max_length=2, default="DE")
    email = models.EmailField(blank=True)
    telefon = models.CharField(max_length=30, blank=True)


class Rechnung(models.Model):
    lieferant = models.ForeignKey(Lieferant, on_delete=models.PROTECT, related_name="rechnungen")
    kostenart = models.ForeignKey(Kostenart, on_delete=models.PROTECT)
    datum = models.DateField()
    name = models.CharField(max_length=200)
    rechnungsnummer = models.CharField(max_length=100)
    betrag = models.DecimalField(max_digits=12, decimal_places=2)


class RechnungsAnteil(models.Model):
    rechnung = models.ForeignKey(Rechnung, on_delete=models.CASCADE, related_name="anteile")
    mietobjekt = models.ForeignKey(Mietobjekt, on_delete=models.PROTECT)
    prozent = models.DecimalField(max_digits=5, decimal_places=2)


class Buchung(models.Model):
    eigentuemer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    buchungstag = models.DateField()
    wertstellung = models.DateField()
    kontoinhaber = models.CharField(max_length=200)
    buchungstext = models.CharField(max_length=500)
    buchungsart = models.CharField(max_length=50)
    betrag = models.DecimalField(max_digits=12, decimal_places=2)


class Zuordnung(models.Model):
    buchung = models.ForeignKey(Buchung, on_delete=models.CASCADE, related_name="zuordnungen")
    betrag = models.DecimalField(max_digits=12, decimal_places=2)
    rechnung = models.ForeignKey(
        Rechnung, on_delete=models.PROTECT, null=True, blank=True, related_name="zuordnungen"
    )
    mietvertrag = models.ForeignKey(
        Mietvertrag, on_delete=models.PROTECT, null=True, blank=True, related_name="zuordnungen"
    )
    darlehen = models.ForeignKey(
        Darlehen, on_delete=models.PROTECT, null=True, blank=True, related_name="zuordnungen"
    )