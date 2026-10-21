from django.db import transaction
from rest_framework import permissions, serializers, viewsets

from ..models import Mietobjekt


def naechste_farbe(eigentuemer):
    """First palette color not yet used by this user's Mietobjekte, BLAU if all are taken."""
    benutzt = set(Mietobjekt.objects.filter(eigentuemer=eigentuemer).values_list("farbe", flat=True))
    return next((f for f in Mietobjekt.Farbe.values if f not in benutzt), Mietobjekt.Farbe.BLAU)


class MietobjektSerializer(serializers.ModelSerializer):
    restschuld = serializers.SerializerMethodField()
    bodenrichtwert = serializers.SerializerMethodField()

    class Meta:
        model = Mietobjekt
        exclude = ["eigentuemer"]

    def get_restschuld(self, obj):
        darlehen = obj.darlehen.all()
        return str(sum(d.restschuld() for d in darlehen)) if darlehen else None

    def get_bodenrichtwert(self, obj):
        # From the prefetched list: the one with the newest datum.
        aktuell = max(obj.bodenrichtwerte.all(), key=lambda b: (b.datum, b.id), default=None)
        return str(aktuell.wert) if aktuell else None

    def validate_plz(self, value):
        if not (value.isdigit() and len(value) == 5):
            raise serializers.ValidationError("PLZ muss 5 Ziffern haben.")
        return value

    def validate(self, data):
        nutzung = data.get("nutzung", getattr(self.instance, "nutzung", None))
        vermietung = data.get("vermietung", getattr(self.instance, "vermietung", ""))

        if nutzung == Mietobjekt.Nutzung.VERMIETUNG and not vermietung:
            raise serializers.ValidationError({"vermietung": "Bitte Art der Vermietung wählen."})
        if nutzung == Mietobjekt.Nutzung.EIGEN:
            data["vermietung"] = ""

        weg_anteil = data.get("weg_anteil", getattr(self.instance, "weg_anteil", None))
        weg_nenner = data.get("weg_nenner", getattr(self.instance, "weg_nenner", None))

        if (weg_anteil is None) != (weg_nenner is None):
            raise serializers.ValidationError({"weg_anteil": "Anteil und Nenner zusammen angeben."})

        return data

    def create(self, validated_data):
        if "farbe" not in validated_data:
            validated_data["farbe"] = naechste_farbe(validated_data["eigentuemer"])
        with transaction.atomic():
            mietobjekt = super().create(validated_data)
            if mietobjekt.vermietung == Mietobjekt.Vermietung.GANZ:
                mietobjekt.einheiten.create(name="Gesamt")
        return mietobjekt


class MietobjektViewSet(viewsets.ModelViewSet):
    serializer_class = MietobjektSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Mietobjekt.objects.filter(eigentuemer=self.request.user).prefetch_related("darlehen", "bodenrichtwerte")

    def perform_create(self, serializer):
        serializer.save(eigentuemer=self.request.user)