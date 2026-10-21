from rest_framework import permissions, serializers, viewsets

from ..models import Lieferant


class LieferantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lieferant
        exclude = ["eigentuemer"]

    def validate(self, data):
        firmenname = data.get("firmenname", getattr(self.instance, "firmenname", ""))
        nachname = data.get("nachname", getattr(self.instance, "nachname", ""))

        if not firmenname and not nachname:
            raise serializers.ValidationError({"firmenname": "Firmenname oder Nachname angeben."})

        return data


class LieferantViewSet(viewsets.ModelViewSet):
    serializer_class = LieferantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Lieferant.objects.filter(eigentuemer=self.request.user).order_by("firmenname", "nachname")

    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)
