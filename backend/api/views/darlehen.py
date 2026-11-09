from decimal import ROUND_HALF_UP, Decimal

from rest_framework import permissions, serializers, viewsets

from ..models import Darlehen


class DarlehenSerializer(serializers.ModelSerializer):
    mietobjekt_name = serializers.CharField(source="mietobjekt.name", read_only=True)
    restschuld = serializers.SerializerMethodField()
    verlauf = serializers.SerializerMethodField()
    zahlungen = serializers.SerializerMethodField()

    class Meta:
        model = Darlehen
        fields = "__all__"

    def get_restschuld(self, obj):
        return str(obj.restschuld())

    def get_verlauf(self, obj):
        return [{"datum": monat["datum"], "rest": str(monat["rest"])} for monat in obj.tilgungsplan()]

    def get_zahlungen(self, obj):
        return [
            {
                "datum": z.buchung.buchungstag,
                "betrag": str(z.betrag),
                "betreff": z.buchung.buchungstext,
                "bank": z.buchung.kontoinhaber,
                "kontostand": str(obj.restschuld(stichtag=z.buchung.buchungstag)),
            }
            for z in obj.zuordnungen.select_related("buchung").order_by("buchung__buchungstag", "id")
        ]

    def validate_mietobjekt(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Mietobjekt nicht gefunden.")
        return value

    def validate(self, data):
        betrag = data.get("betrag", getattr(self.instance, "betrag", None))
        sollzins = data.get("sollzins", getattr(self.instance, "sollzins", None))
        art = data.get("art", getattr(self.instance, "art", None))
        monatsbetrag = data.get("monatsbetrag", getattr(self.instance, "monatsbetrag", None))

        if betrag is not None and betrag <= 0:
            raise serializers.ValidationError({"betrag": "Betrag muss größer als 0 sein."})
        if sollzins is not None and sollzins < 0:
            raise serializers.ValidationError({"sollzins": "Sollzins darf nicht negativ sein."})
        if monatsbetrag is not None and monatsbetrag <= 0:
            raise serializers.ValidationError({"monatsbetrag": "Betrag muss größer als 0 sein."})
        # Otherwise the Annuität never repays anything: the whole Rate goes to Zins.
        if art == Darlehen.Art.ANNUITAET and None not in (betrag, sollzins, monatsbetrag) and betrag > 0:
            zins = (betrag * sollzins / 100 / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if monatsbetrag <= zins:
                raise serializers.ValidationError(
                    {"monatsbetrag": f"Die Rate muss größer sein als der Zins im ersten Monat ({zins:.2f} €)."}
                )

        return data


class DarlehenViewSet(viewsets.ModelViewSet):
    serializer_class = DarlehenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Darlehen.objects.filter(mietobjekt__eigentuemer=self.request.user)
            .select_related("mietobjekt")
            .order_by("id")
        )
        mietobjekt_id = self.request.query_params.get("mietobjekt")
        return qs.filter(mietobjekt_id=mietobjekt_id) if mietobjekt_id else qs
