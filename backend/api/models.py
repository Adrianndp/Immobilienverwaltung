from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Mietobjekt(models.Model):
    class Objekttyp(models.TextChoices):
        MEHRFAMILIENHAUS = "MFH", "Mehrfamilienhaus"
        EIGENTUMSWOHNUNG = "ETW", "Eigentumswohnung"
        EINFAMILIENHAUS = "EFH", "Einfamilienhaus"
        GEWERBEEINHEIT = "GEW", "Gewerbeeinheit"
        GARAGE_STELLPLATZ = "GAR", "Garage/Stellplatz"
        SONSTIGES = "SON", "Sonstiges"

    eigentuemer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mietobjekte"
    )
    objekttyp = models.CharField(max_length=3, choices=Objekttyp.choices)

    strasse = models.CharField(max_length=100)
    hausnummer = models.CharField(max_length=10)
    plz = models.CharField(max_length=5)
    stadt = models.CharField(max_length=100)
    land = models.CharField(max_length=2, default="DE")  # ISO code; UI shows "Deutschland"

    erstellt_am = models.DateTimeField(auto_now_add=True)
    geaendert_am = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Mietobjekte"
        ordering = ["stadt", "strasse", "hausnummer"]

    def __str__(self):
        return f"{self.strasse} {self.hausnummer}, {self.plz} {self.stadt}"


class Einheit(models.Model):
    class Einheitstyp(models.TextChoices):
        WOHNUNG = "WHG", "Wohnung"
        GEWERBEEINHEIT = "GEW", "Gewerbeeinheit"
        GARAGE_STELLPLATZ = "GAR", "Garage/Stellplatz"
        SONSTIGES = "SON", "Sonstiges"

    class Geschoss(models.TextChoices):
        KELLERGESCHOSS = "KG", "Kellergeschoss"
        UNTERGESCHOSS = "UG", "Untergeschoss"
        ERDGESCHOSS = "EG", "Erdgeschoss"
        OBERGESCHOSS = "OG", "Obergeschoss"
        ZWISCHENGESCHOSS = "ZG", "Zwischengeschoss"
        DACHGESCHOSS = "DG", "Dachgeschoss"

    class Lage(models.TextChoices):
        LINKS = "L", "links"
        MITTE = "M", "mitte"
        RECHTS = "R", "rechts"

    mietobjekt = models.ForeignKey(
        Mietobjekt, on_delete=models.CASCADE, related_name="einheiten"
    )
    einheitstyp = models.CharField(max_length=3, choices=Einheitstyp.choices)
    bezeichnung = models.CharField(max_length=100)
    vermietete_flaeche = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    geschoss = models.CharField(
        max_length=2, choices=Geschoss.choices, default=Geschoss.ERDGESCHOSS, blank=True
    )
    etage = models.SmallIntegerField(default=0)  # negative for Keller
    lage = models.CharField(max_length=1, choices=Lage.choices, blank=True)

    class Meta:
        verbose_name_plural = "Einheiten"
        ordering = ["etage", "bezeichnung"]
        constraints = [
            models.UniqueConstraint(
                fields=["mietobjekt", "bezeichnung"], name="unique_einheit_bezeichnung_pro_objekt"
            )
        ]

    def __str__(self):
        return f"{self.bezeichnung} – {self.mietobjekt}"