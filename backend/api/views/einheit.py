from rest_framework import permissions, serializers, viewsets

from ..models import Einheit


class EinheitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Einheit
        fields = "__all__"

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