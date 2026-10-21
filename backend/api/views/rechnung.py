from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, Max, ProtectedError, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.response import Response

from ..models import Rechnung, RechnungsAnteil


class RechnungsAnteilSerializer(serializers.ModelSerializer):
    mietobjekt_name = serializers.CharField(source="mietobjekt.name", read_only=True)

    class Meta:
        model = RechnungsAnteil
        fields = ["mietobjekt", "mietobjekt_name", "prozent"]

    def validate_mietobjekt(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Mietobjekt nicht gefunden.")
        return value


class RechnungSerializer(serializers.ModelSerializer):
    anteile = RechnungsAnteilSerializer(many=True)
    lieferant_name = serializers.SerializerMethodField()
    kostenart_name = serializers.CharField(source="kostenart.name", read_only=True)
    offener_betrag = serializers.SerializerMethodField()
    bezahlt_am = serializers.SerializerMethodField()

    class Meta:
        model = Rechnung
        fields = "__all__"

    def get_lieferant_name(self, obj):
        lieferant = obj.lieferant
        return lieferant.firmenname or f"{lieferant.vorname} {lieferant.nachname}".strip()

    # summe_bezahlt/letzte_zahlung are annotated by the viewset; a freshly created Rechnung has no payments.
    def _offen(self, obj):
        return obj.betrag - getattr(obj, "summe_bezahlt", Decimal("0"))

    def get_offener_betrag(self, obj):
        return str(self._offen(obj))

    def get_bezahlt_am(self, obj):
        letzte_zahlung = getattr(obj, "letzte_zahlung", None)
        return letzte_zahlung if self._offen(obj) <= 0 else None

    def validate_lieferant(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Lieferant nicht gefunden.")
        return value

    def validate_kostenart(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Kostenart nicht gefunden.")
        return value

    def validate(self, data):
        anteile = data.get("anteile")
        if anteile is None:
            return data

        if not anteile:
            raise serializers.ValidationError({"anteile": "Mindestens ein Mietobjekt angeben."})
        mietobjekte = [anteil["mietobjekt"].pk for anteil in anteile]
        if len(mietobjekte) != len(set(mietobjekte)):
            raise serializers.ValidationError({"anteile": "Jedes Mietobjekt darf nur einmal vorkommen."})
        if sum(anteil["prozent"] for anteil in anteile) != 100:
            raise serializers.ValidationError({"anteile": "Die Anteile müssen zusammen genau 100 % ergeben."})

        return data

    def create(self, validated_data):
        anteile = validated_data.pop("anteile")
        with transaction.atomic():
            rechnung = Rechnung.objects.create(**validated_data)
            RechnungsAnteil.objects.bulk_create(RechnungsAnteil(rechnung=rechnung, **a) for a in anteile)
        return rechnung

    def update(self, instance, validated_data):
        # Without this, ModelSerializer refuses nested writes on PUT/PATCH.
        anteile = validated_data.pop("anteile", None)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if anteile is not None:
                instance.anteile.all().delete()
                RechnungsAnteil.objects.bulk_create(RechnungsAnteil(rechnung=instance, **a) for a in anteile)
        return instance


class RechnungViewSet(viewsets.ModelViewSet):
    serializer_class = RechnungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Rechnung.objects.filter(lieferant__eigentuemer=self.request.user)
            .select_related("lieferant", "kostenart")
            .prefetch_related("anteile__mietobjekt")
            .annotate(
                summe_bezahlt=Coalesce(
                    Sum("zuordnungen__betrag"),
                    Value(Decimal("0")),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                letzte_zahlung=Max("zuordnungen__buchung__buchungstag"),
            )
            .order_by("-datum", "-id")
        )
        lieferant_id = self.request.query_params.get("lieferant")
        return qs.filter(lieferant_id=lieferant_id) if lieferant_id else qs

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Rechnung ist bereits einer Zahlung zugeordnet und kann nicht gelöscht werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )
