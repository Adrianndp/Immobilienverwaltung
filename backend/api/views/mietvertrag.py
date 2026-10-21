from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, serializers, viewsets

from ..models import Mieter, Mietvertrag


class MieterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mieter
        exclude = ["eigentuemer"]


class MietvertragSerializer(serializers.ModelSerializer):
    mieter = MieterSerializer()
    einheit_name = serializers.CharField(source="einheit.name", read_only=True)
    mietobjekt_name = serializers.CharField(source="einheit.mietobjekt.name", read_only=True)
    farbe = serializers.CharField(source="einheit.mietobjekt.farbe", read_only=True)

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

        return data

    def create(self, validated_data):
        mieter_data = validated_data.pop("mieter")
        with transaction.atomic():
            mieter = Mieter.objects.create(eigentuemer=self.context["request"].user, **mieter_data)
            return Mietvertrag.objects.create(mieter=mieter, **validated_data)

    def update(self, instance, validated_data):
        mieter_data = validated_data.pop("mieter", None)
        with transaction.atomic():
            if mieter_data:
                for feld, wert in mieter_data.items():
                    setattr(instance.mieter, feld, wert)
                instance.mieter.save()
            return super().update(instance, validated_data)


class MietvertragViewSet(viewsets.ModelViewSet):
    serializer_class = MietvertragSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
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

    def perform_destroy(self, instance):
        # One card = one Mietvertrag with its Mieter, so the Mieter goes too unless they have other contracts.
        with transaction.atomic():
            mieter = instance.mieter
            instance.delete()
            if not mieter.vertraege.exists():
                mieter.delete()
