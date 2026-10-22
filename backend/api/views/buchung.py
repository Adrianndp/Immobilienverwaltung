import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import Buchung, Zuordnung
from .rechnung import lieferant_name


class ZuordnungSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zuordnung
        fields = ["betrag", "mietvertrag", "rechnung", "darlehen"]

    def validate_betrag(self, value):
        if value <= 0:
            raise serializers.ValidationError("Betrag muss größer als 0 sein.")
        return value

    def validate_mietvertrag(self, value):
        if value is not None and value.mieter.eigentuemer_id != self.context["request"].user.id:
            raise serializers.ValidationError("Mietvertrag nicht gefunden.")
        return value

    def validate_rechnung(self, value):
        if value is not None and value.lieferant.eigentuemer_id != self.context["request"].user.id:
            raise serializers.ValidationError("Rechnung nicht gefunden.")
        return value

    def validate_darlehen(self, value):
        if value is not None and value.mietobjekt.eigentuemer_id != self.context["request"].user.id:
            raise serializers.ValidationError("Darlehen nicht gefunden.")
        return value

    def validate(self, data):
        ziele = [data.get(feld) for feld in ("mietvertrag", "rechnung", "darlehen")]
        if sum(ziel is not None for ziel in ziele) != 1:
            raise serializers.ValidationError("Genau einen Mietvertrag, eine Rechnung oder ein Darlehen angeben.")
        return data


class BuchungSerializer(serializers.ModelSerializer):
    zuordnungen = ZuordnungSerializer(many=True)
    partner = serializers.SerializerMethodField()
    rechnungen = serializers.SerializerMethodField()
    nicht_zugeordnet = serializers.SerializerMethodField()

    class Meta:
        model = Buchung
        fields = [
            "id",
            "buchungstag",
            "wertstellung",
            "kontoinhaber",
            "buchungstext",
            "buchungsart",
            "betrag",
            "zuordnungen",
            "partner",
            "rechnungen",
            "nicht_zugeordnet",
        ]
        read_only_fields = ["buchungstag", "wertstellung", "kontoinhaber", "buchungstext", "buchungsart", "betrag"]

    def get_partner(self, obj):
        namen = []
        for z in obj.zuordnungen.all():
            if z.mietvertrag:
                namen.append(f"{z.mietvertrag.mieter.vorname} {z.mietvertrag.mieter.nachname}")
            elif z.rechnung:
                namen.append(lieferant_name(z.rechnung.lieferant))
            elif z.darlehen:
                namen.append(z.darlehen.bank)
        # dict.fromkeys drops duplicates (e.g. two Rechnungen of the same Lieferant) but keeps the order.
        return ", ".join(dict.fromkeys(namen))

    def get_rechnungen(self, obj):
        return ", ".join(z.rechnung.rechnungsnummer for z in obj.zuordnungen.all() if z.rechnung)

    def get_nicht_zugeordnet(self, obj):
        # From the prefetched list, like partner; positive also for outgoing Buchungen.
        return str(abs(obj.betrag) - sum((z.betrag for z in obj.zuordnungen.all()), Decimal("0")))

    def validate(self, data):
        zuordnungen = data.get("zuordnungen")
        if zuordnungen is None:
            return data

        eingehend = self.instance.betrag > 0
        if eingehend and any(z.get("rechnung") or z.get("darlehen") for z in zuordnungen):
            raise serializers.ValidationError(
                {"zuordnungen": "Eingänge können nur Mietverträgen zugeordnet werden."}
            )
        if not eingehend and any(z.get("mietvertrag") for z in zuordnungen):
            raise serializers.ValidationError(
                {"zuordnungen": "Ausgänge können nur Rechnungen oder Darlehen zugeordnet werden."}
            )
        if sum(z["betrag"] for z in zuordnungen) > abs(self.instance.betrag):
            raise serializers.ValidationError(
                {"zuordnungen": "Die Zuordnungen sind zusammen höher als der Buchungsbetrag."}
            )

        return data

    def update(self, instance, validated_data):
        zuordnungen = validated_data.pop("zuordnungen", None)
        with transaction.atomic():
            if zuordnungen is not None:
                instance.zuordnungen.all().delete()
                Zuordnung.objects.bulk_create(Zuordnung(buchung=instance, **z) for z in zuordnungen)
        return instance


class BuchungViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = BuchungSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Buchung.objects.filter(eigentuemer=self.request.user)
            .prefetch_related(
                "zuordnungen__mietvertrag__mieter", "zuordnungen__rechnung__lieferant", "zuordnungen__darlehen"
            )
            .order_by("-buchungstag")
        )

    @action(detail=False, methods=["post"], url_path="import")
    def importieren(self, request):
        try:
            text = request.FILES["datei"].read().decode("utf-8")
            # Parse everything first so that a broken row imports nothing.
            zeilen = [
                {
                    "buchungstag": date.fromisoformat(zeile["buchungstag"]),
                    "wertstellung": date.fromisoformat(zeile["wertstellung"]),
                    "kontoinhaber": zeile["kontoinhaber"],
                    "buchungstext": zeile["buchungstext"],
                    "buchungsart": zeile["buchungsart"],
                    "betrag": Decimal(zeile["betrag"]),
                }
                for zeile in csv.DictReader(io.StringIO(text))
            ]
        except (KeyError, TypeError, ValueError, InvalidOperation, csv.Error):
            return Response({"detail": "Datei konnte nicht gelesen werden."}, status=status.HTTP_400_BAD_REQUEST)

        importiert = 0
        with transaction.atomic():
            for zeile in zeilen:
                _, neu = Buchung.objects.get_or_create(eigentuemer=request.user, **zeile)
                importiert += neu
        return Response({"importiert": importiert, "uebersprungen": len(zeilen) - importiert})
