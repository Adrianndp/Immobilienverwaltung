from decimal import ROUND_HALF_UP, Decimal

from rest_framework import permissions, serializers, viewsets

from ..models import Bodenrichtwert


def grundstueckswert(mietobjekt, wert):
    """Bodenrichtwert (€/m²) times the plot area, only the WEG share if there is one. None without a plot area."""
    if mietobjekt.grundstuecksflaeche is None:
        return None
    flaeche = mietobjekt.grundstuecksflaeche
    if mietobjekt.weg_anteil is not None and mietobjekt.weg_nenner:
        flaeche = flaeche * mietobjekt.weg_anteil / mietobjekt.weg_nenner
    return (flaeche * wert).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class BodenrichtwertSerializer(serializers.ModelSerializer):
    grundstueckswert = serializers.SerializerMethodField()

    class Meta:
        model = Bodenrichtwert
        fields = "__all__"

    def get_grundstueckswert(self, obj):
        wert = grundstueckswert(obj.mietobjekt, obj.wert)
        return None if wert is None else str(wert)

    def validate_mietobjekt(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Mietobjekt nicht gefunden.")
        return value

    def validate_wert(self, value):
        if value <= 0:
            raise serializers.ValidationError("Wert muss größer als 0 sein.")
        return value

    def validate(self, data):
        mietobjekt = data.get("mietobjekt", getattr(self.instance, "mietobjekt", None))
        datum = data.get("datum", getattr(self.instance, "datum", None))
        doppelt = Bodenrichtwert.objects.filter(mietobjekt=mietobjekt, datum=datum)
        if self.instance:
            doppelt = doppelt.exclude(pk=self.instance.pk)
        if doppelt.exists():
            raise serializers.ValidationError({"datum": "Für dieses Datum gibt es schon einen Bodenrichtwert."})
        return data


class BodenrichtwertViewSet(viewsets.ModelViewSet):
    serializer_class = BodenrichtwertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Bodenrichtwert.objects.filter(mietobjekt__eigentuemer=self.request.user)
            .select_related("mietobjekt")
            .order_by("-datum", "-id")
        )
        mietobjekt_id = self.request.query_params.get("mietobjekt")
        return qs.filter(mietobjekt_id=mietobjekt_id) if mietobjekt_id else qs
