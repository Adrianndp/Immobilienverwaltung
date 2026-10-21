from rest_framework import permissions, serializers, viewsets

from ..models import Kostenart


class KostenartSerializer(serializers.ModelSerializer):
    kategorie_label = serializers.CharField(source="get_kategorie_display", read_only=True)

    class Meta:
        model = Kostenart
        exclude = ["eigentuemer"]

    def validate_name(self, value):
        # eigentuemer is not a serializer field, so DRF does not check the (eigentuemer, name) constraint itself.
        qs = Kostenart.objects.filter(eigentuemer=self.context["request"].user, name=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Eine Kostenart mit diesem Namen gibt es bereits.")
        return value

    def validate(self, data):
        kategorie = data.get("kategorie", getattr(self.instance, "kategorie", None))
        prozent = data.get("abschreibung_prozent", getattr(self.instance, "abschreibung_prozent", None))

        if kategorie == Kostenart.Kategorie.ABSCHREIBUNG:
            if prozent is None or not 0 < prozent <= 100:
                raise serializers.ValidationError(
                    {"abschreibung_prozent": "Bitte einen Prozentsatz über 0 und bis 100 angeben."}
                )
        else:
            data["abschreibung_prozent"] = None

        return data


class KostenartViewSet(viewsets.ModelViewSet):
    serializer_class = KostenartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Kostenart.objects.filter(eigentuemer=self.request.user).order_by("name")

    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)
