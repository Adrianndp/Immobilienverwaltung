from datetime import date, timedelta
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Count, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, Round
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.exceptions import APIException

from ..models import Einheit, Mieter, Mietvertrag, RechnungsAnteil, Zuordnung

GELD = models.DecimalField(max_digits=12, decimal_places=2)


def mit_summen(qs):
    """Adds einnahmen_seit_beginn and kosten_seit_beginn (the Einheit's equal share of the Mietobjekt's Rechnungen)."""
    einnahmen = (
        Zuordnung.objects.filter(mietvertrag=OuterRef("pk"))
        .order_by()
        .values("mietvertrag")
        .annotate(summe=Sum("betrag"))
        .values("summe")
    )
    kosten = (
        RechnungsAnteil.objects.filter(
            mietobjekt=OuterRef("einheit__mietobjekt"),
            rechnung__datum__gte=OuterRef("beginn"),
            rechnung__datum__lte=Coalesce(OuterRef("ende"), Value(date.max), output_field=models.DateField()),
        )
        .order_by()
        .values("mietobjekt")
        .annotate(summe=Sum(Round(F("rechnung__betrag") * F("prozent") / Decimal("100"), 2), output_field=GELD))
        .values("summe")
    )
    einheiten = (
        Einheit.objects.filter(mietobjekt=OuterRef("einheit__mietobjekt"))
        .order_by()
        .values("mietobjekt")
        .annotate(anzahl=Count("pk"))
        .values("anzahl")
    )
    return qs.annotate(
        einnahmen_seit_beginn=Coalesce(Subquery(einnahmen), Decimal("0"), output_field=GELD),
        kosten_seit_beginn=Round(
            Coalesce(Subquery(kosten), Decimal("0"), output_field=GELD) / Subquery(einheiten), 2, output_field=GELD
        ),
    )


class Ueberschneidung(APIException):
    """409: the Einheit is already let in that period. The body as given, without DRF turning values into strings."""

    status_code = status.HTTP_409_CONFLICT

    def __init__(self, konflikte, kann_beenden):
        self.detail = {"code": "ueberschneidung", "konflikte": konflikte, "kann_beenden": kann_beenden}


class MieterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mieter
        exclude = ["eigentuemer"]


class MietvertragSerializer(serializers.ModelSerializer):
    mieter = MieterSerializer()
    einheit_name = serializers.CharField(source="einheit.name", read_only=True)
    mietobjekt_name = serializers.CharField(source="einheit.mietobjekt.name", read_only=True)
    farbe = serializers.CharField(source="einheit.mietobjekt.farbe", read_only=True)
    # Annotated by mit_summen().
    einnahmen_seit_beginn = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    kosten_seit_beginn = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    # Confirmation from the warning dialog: end the overlapping older contracts the day before beginn.
    aelteren_beenden = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Mietvertrag
        fields = "__all__"

    def validate_einheit(self, value):
        if value.mietobjekt.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Einheit nicht gefunden.")
        return value

    def validate(self, data):
        beginn = data.get("beginn", getattr(self.instance, "beginn", None))
        ende = data.get("ende", getattr(self.instance, "ende", None))

        if ende is not None and beginn is not None and ende < beginn:
            raise serializers.ValidationError({"ende": "Vertragsende darf nicht vor dem Beginn liegen."})

        self.zu_beenden = []
        einheit = data.get("einheit", getattr(self.instance, "einheit", None))
        aelteren_beenden = data.pop("aelteren_beenden", False)
        if einheit is None or beginn is None:
            return data

        # Same Einheit and the periods intersect; a missing ende means open-ended.
        konflikte = list(
            Mietvertrag.objects.filter(einheit=einheit, beginn__lte=ende or date.max)
            .filter(Q(ende__isnull=True) | Q(ende__gte=beginn))
            .exclude(pk=getattr(self.instance, "pk", None))
            .select_related("mieter", "einheit__mietobjekt")
            .order_by("beginn")
        )
        if not konflikte:
            return data

        # Only contracts that started earlier can be ended the day before.
        kann_beenden = all(k.beginn < beginn for k in konflikte)
        if aelteren_beenden and kann_beenden:
            self.zu_beenden = konflikte
            return data
        raise Ueberschneidung(
            [
                {
                    "id": k.id,
                    "mieter_name": f"{k.mieter.vorname} {k.mieter.nachname}",
                    "beginn": k.beginn.isoformat(),
                    "ende": k.ende.isoformat() if k.ende else None,
                    "einheit_label": f"{k.einheit.mietobjekt.name} – {k.einheit.name}",
                }
                for k in konflikte
            ],
            kann_beenden,
        )

    def aeltere_beenden(self, beginn):
        for vertrag in self.zu_beenden:
            vertrag.ende = beginn - timedelta(days=1)
            vertrag.save(update_fields=["ende"])

    def create(self, validated_data):
        mieter_data = validated_data.pop("mieter")
        with transaction.atomic():
            self.aeltere_beenden(validated_data["beginn"])
            mieter = Mieter.objects.create(eigentuemer=self.context["request"].user, **mieter_data)
            return Mietvertrag.objects.create(mieter=mieter, **validated_data)

    def update(self, instance, validated_data):
        mieter_data = validated_data.pop("mieter", None)
        with transaction.atomic():
            self.aeltere_beenden(validated_data.get("beginn", instance.beginn))
            if mieter_data:
                for feld, wert in mieter_data.items():
                    setattr(instance.mieter, feld, wert)
                instance.mieter.save()
            return super().update(instance, validated_data)


class MietvertragViewSet(viewsets.ModelViewSet):
    serializer_class = MietvertragSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = mit_summen(
            Mietvertrag.objects.filter(mieter__eigentuemer=self.request.user)
            .select_related("mieter", "einheit__mietobjekt")
            .order_by("mieter__nachname", "mieter__vorname")
        )
        heute = timezone.localdate()
        status = self.request.query_params.get("status")
        if status == "laufend":
            return qs.filter(Q(ende__isnull=True) | Q(ende__gte=heute), beginn__lte=heute)
        if status == "zukuenftig":
            return qs.filter(beginn__gt=heute)
        if status == "archiv":
            return qs.filter(ende__lt=heute)
        return qs

    # Reload after saving so the response has the annotated sums, matching the new beginn/ende/einheit.
    def perform_create(self, serializer):
        serializer.save()
        serializer.instance = mit_summen(Mietvertrag.objects.filter(pk=serializer.instance.pk)).get()

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance = mit_summen(Mietvertrag.objects.filter(pk=serializer.instance.pk)).get()

    def perform_destroy(self, instance):
        # One card = one Mietvertrag with its Mieter, so the Mieter goes too unless they have other contracts.
        with transaction.atomic():
            mieter = instance.mieter
            instance.delete()
            if not mieter.vertraege.exists():
                mieter.delete()
