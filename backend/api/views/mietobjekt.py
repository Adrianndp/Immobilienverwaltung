from rest_framework import serializers, viewsets, permissions
from ..models import Mietobjekt


class MietobjektSerializer(serializers.ModelSerializer):
    objekttyp_label = serializers.CharField(source="get_objekttyp_display", read_only=True)

    class Meta:
        model = Mietobjekt
        fields = [
            "id", "objekttyp_label",
            "strasse", "hausnummer", "plz",
            "erstellt_am", "geaendert_am",
        ]
        read_only_fields = ["id", "erstellt_am", "geaendert_am"]

    def validate_plz(self, value):
        if not (value.isdigit() and len(value) == 5):
            raise serializers.ValidationError("PLZ muss 5 Ziffern haben.")
        return value



class MietobjektViewSet(viewsets.ModelViewSet):
    serializer_class = MietobjektSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Mietobjekt.objects.filter(eigentuemer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)