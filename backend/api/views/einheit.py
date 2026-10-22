from django.db.models import Exists, OuterRef, ProtectedError
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.response import Response

from ..models import Einheit, Mietobjekt, Mietvertrag

HAT_VERTRAEGE = "Einheit hat Mietverträge und kann nicht gelöscht werden."
GESAMT_BENOETIGT = "Die Einheit „Gesamt“ wird bei Vermietung im Ganzen benötigt."


class EinheitSerializer(serializers.ModelSerializer):
    # Annotated by the viewset; any Mietvertrag counts, also future and ended ones.
    hat_vertraege = serializers.BooleanField(read_only=True)

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
        # Ordered by id: without it Postgres returns a renamed Einheit last, and the running numbers shift.
        qs = (
            Einheit.objects.filter(mietobjekt__eigentuemer=self.request.user)
            .annotate(hat_vertraege=Exists(Mietvertrag.objects.filter(einheit=OuterRef("pk"))))
            .order_by("id")
        )
        mietobjekt_id = self.request.query_params.get("mietobjekt")
        return qs.filter(mietobjekt_id=mietobjekt_id) if mietobjekt_id else qs

    # Reload after saving so the response has the annotated hat_vertraege.
    def perform_create(self, serializer):
        serializer.save()
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance = self.get_queryset().get(pk=serializer.instance.pk)

    def destroy(self, request, *args, **kwargs):
        einheit = self.get_object()
        if einheit.hat_vertraege:
            return Response({"detail": HAT_VERTRAEGE}, status=status.HTTP_400_BAD_REQUEST)
        mietobjekt = einheit.mietobjekt
        if mietobjekt.vermietung == Mietobjekt.Vermietung.GANZ and mietobjekt.einheiten.count() == 1:
            return Response({"detail": GESAMT_BENOETIGT}, status=status.HTTP_400_BAD_REQUEST)
        try:
            einheit.delete()
        except ProtectedError:
            # A Mietvertrag created since the check above; Mietvertrag is the only PROTECT reference.
            return Response({"detail": HAT_VERTRAEGE}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
