from decimal import Decimal

from django.db import models, transaction
from django.db.models import F, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce, Round
from rest_framework import permissions, serializers, viewsets

from ..models import Mietobjekt, RechnungsAnteil, Zuordnung

GELD = models.DecimalField(max_digits=12, decimal_places=2)


def mit_ergebnis(qs):
    """Adds erwirtschafteter_betrag: Zuordnungen to its Mietverträge minus its share of all Rechnungen."""
    einnahmen = (
        Zuordnung.objects.filter(mietvertrag__einheit__mietobjekt=OuterRef("pk"))
        .order_by()
        .values("mietvertrag__einheit__mietobjekt")
        .annotate(summe=Sum("betrag"))
        .values("summe")
    )
    kosten = (
        RechnungsAnteil.objects.filter(mietobjekt=OuterRef("pk"))
        .order_by()
        .values("mietobjekt")
        .annotate(summe=Sum(Round(F("rechnung__betrag") * F("prozent") / Decimal("100"), 2), output_field=GELD))
        .values("summe")
    )
    return qs.annotate(
        erwirtschafteter_betrag=Round(
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
    # Annotated by mit_ergebnis().
    erwirtschafteter_betrag = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Mietobjekt
        exclude = ["eigentuemer"]

    def get_restschuld(self, obj):
        darlehen = obj.darlehen.all()
        return str(sum(d.restschuld() for d in darlehen)) if darlehen else None

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

    # Reload after saving so the response has the annotated erwirtschafteter_betrag.
    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)