from datetime import timedelta
from decimal import Decimal

from django.db import models, transaction
from django.db.models import F, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce, Round
from django.utils import timezone
from rest_framework import permissions, serializers, viewsets

from ..models import Mietobjekt, RechnungsAnteil, Zuordnung

GELD = models.DecimalField(max_digits=12, decimal_places=2)


def letzte_12_monate():
    """(von, bis), both included: the 12 months up to today, e.g. 23.10.2025 to 22.10.2026."""
    bis = timezone.localdate()
    # 29 February has no counterpart a year earlier.
    vor_einem_jahr = bis.replace(year=bis.year - 1, day=min(bis.day, 28) if bis.month == 2 else bis.day)
    return vor_einem_jahr + timedelta(days=1), bis


def mit_ergebnis(qs):
    """Adds ergebnis_vor_zinsen: Zuordnungen to its Mietverträge minus its share of the Rechnungen, last 12 months.

    The serializer subtracts the Schuldzinsen, which come from the Tilgungsplan in Python.
    """
    von, bis = letzte_12_monate()
    einnahmen = (
        Zuordnung.objects.filter(
            mietvertrag__einheit__mietobjekt=OuterRef("pk"), buchung__buchungstag__range=(von, bis)
        )
        .order_by()
        .values("mietvertrag__einheit__mietobjekt")
        .annotate(summe=Sum("betrag"))
        .values("summe")
    )
    kosten = (
        RechnungsAnteil.objects.filter(mietobjekt=OuterRef("pk"), rechnung__datum__range=(von, bis))
        .order_by()
        .values("mietobjekt")
        .annotate(summe=Sum(Round(F("rechnung__betrag") * F("prozent") / Decimal("100"), 2), output_field=GELD))
        .values("summe")
    )
    return qs.annotate(
        ergebnis_vor_zinsen=Round(
            Coalesce(Subquery(einnahmen), Decimal("0"), output_field=GELD)
            - Coalesce(Subquery(kosten), Decimal("0"), output_field=GELD),
            2,
            output_field=GELD,
        )
    )


def naechste_farbe(eigentuemer):
    """First palette color not yet used by this user's Mietobjekte, BLAU if all are taken."""
    benutzt = set(Mietobjekt.objects.filter(eigentuemer=eigentuemer).values_list("farbe", flat=True))
    return next((f for f in Mietobjekt.Farbe.values if f not in benutzt), Mietobjekt.Farbe.BLAU)


class MietobjektSerializer(serializers.ModelSerializer):
    restschuld = serializers.SerializerMethodField()
    bodenrichtwert = serializers.SerializerMethodField()
    erwirtschafteter_betrag = serializers.SerializerMethodField()

    class Meta:
        model = Mietobjekt
        exclude = ["eigentuemer"]

    def get_restschuld(self, obj):
        darlehen = obj.darlehen.all()
        return str(sum(d.restschuld() for d in darlehen)) if darlehen else None

    def get_erwirtschafteter_betrag(self, obj):
        # Not meaningful without rent.
        if obj.nutzung == Mietobjekt.Nutzung.EIGEN:
            return None
        # Rent minus costs (annotated by mit_ergebnis) minus Schuldzinsen, last 12 months; Tilgung is not a cost.
        von, bis = letzte_12_monate()
        zinsen = sum((d.zinsen(von, bis) for d in obj.darlehen.all()), Decimal("0"))
        return str((obj.ergebnis_vor_zinsen - zinsen).quantize(Decimal("0.01")))

    def get_bodenrichtwert(self, obj):
        # From the prefetched list: the one with the newest datum.
        aktuell = max(obj.bodenrichtwerte.all(), key=lambda b: (b.datum, b.id), default=None)
        return str(aktuell.wert) if aktuell else None

    def validate_plz(self, value):
        if not (value.isdigit() and len(value) == 5):
            raise serializers.ValidationError("PLZ muss 5 Ziffern haben.")
        return value

    def validate(self, data):
        nutzung = data.get("nutzung", getattr(self.instance, "nutzung", None))
        vermietung = data.get("vermietung", getattr(self.instance, "vermietung", ""))

        if nutzung == Mietobjekt.Nutzung.VERMIETUNG and not vermietung:
            raise serializers.ValidationError({"vermietung": "Bitte Art der Vermietung wählen."})
        if nutzung == Mietobjekt.Nutzung.EIGEN:
            data["vermietung"] = ""

        objektart = data.get("objektart", getattr(self.instance, "objektart", None))
        if objektart not in Mietobjekt.WEG_OBJEKTARTEN:
            data["weg_anteil"] = data["weg_nenner"] = None

        weg_anteil = data.get("weg_anteil", getattr(self.instance, "weg_anteil", None))
        weg_nenner = data.get("weg_nenner", getattr(self.instance, "weg_nenner", None))

        if (weg_anteil is None) != (weg_nenner is None):
            raise serializers.ValidationError({"weg_anteil": "Anteil und Nenner zusammen angeben."})

        return data

    def create(self, validated_data):
        if "farbe" not in validated_data:
            validated_data["farbe"] = naechste_farbe(validated_data["eigentuemer"])
        with transaction.atomic():
            mietobjekt = super().create(validated_data)
            if mietobjekt.vermietung == Mietobjekt.Vermietung.GANZ:
                mietobjekt.einheiten.create(name="Gesamt")
        return mietobjekt


class MietobjektViewSet(viewsets.ModelViewSet):
    serializer_class = MietobjektSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return mit_ergebnis(
            Mietobjekt.objects.filter(eigentuemer=self.request.user).prefetch_related("darlehen", "bodenrichtwerte")
        )

    # Reload after saving so the response has the annotated ergebnis_vor_zinsen.
    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)