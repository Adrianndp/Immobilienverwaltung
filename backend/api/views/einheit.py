from rest_framework import serializers, viewsets, permissions
from ..models import Einheit


class EinheitSerializer(serializers.ModelSerializer):
    einheitstyp_label = serializers.CharField(source="get_einheitstyp_display", read_only=True)
    geschoss_label = serializers.CharField(source="get_geschoss_display", read_only=True)
    lage_label = serializers.CharField(source="get_lage_display", read_only=True)

    class Meta:
        model = Einheit
        fields = ["id", "mietobjekt", "einheitstyp", "bezeichnung",
                  "vermietete_flaeche", "geschoss", "etage", "lage",
                    "einheitstyp_label", "geschoss_label", "lage_label"]

    def validate_mietobjekt(self, value):
        if value.eigentuemer != self.context["request"].user:
            raise serializers.ValidationError("Mietobjekt nicht gefunden.")
        return value


class EinheitViewSet(viewsets.ModelViewSet):
    serializer_class = EinheitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Einheit.objects.filter(mietobjekt__eigentuemer=self.request.user)
        mietobjekt_id = self.request.query_params.get("mietobjekt")
        return qs.filter(mietobjekt_id=mietobjekt_id) if mietobjekt_id else qs