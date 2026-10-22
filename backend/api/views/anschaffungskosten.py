from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from ..models import Anschaffungskosten

SUMMEN = ["summe_anschaffung", "summe_herstellung", "summe_nachtraeglich", "gesamtkosten", "gesamtkosten_objekt"]


def summen(kaufpreis, betraege):
    """The sum rows of the Kaufpreis popup; betraege maps each amount field to its value. Same as the frontend."""

    def summe(felder):
        return sum((betraege[f] for f in felder), Decimal("0"))

    nebenkosten = summe(Anschaffungskosten.NEBENKOSTEN) - summe(Anschaffungskosten.ABZUEGE)
    anschaffung = (kaufpreis or Decimal("0")) + nebenkosten
    herstellung = summe(Anschaffungskosten.HERSTELLUNGSKOSTEN)
    nachtraeglich = summe(Anschaffungskosten.NACHTRAEGLICH)
    gesamt = anschaffung + herstellung + nachtraeglich
    werte = [anschaffung, herstellung, nachtraeglich, gesamt, gesamt - betraege["anteil_grund_boden"]]
    return dict(zip(SUMMEN, werte))


class AnschaffungskostenSerializer(serializers.ModelSerializer):
    kaufpreis = serializers.DecimalField(
        source="mietobjekt.kaufpreis", max_digits=12, decimal_places=2, allow_null=True, min_value=Decimal("0")
    )

    class Meta:
        model = Anschaffungskosten
        exclude = ["id", "mietobjekt"]
        extra_kwargs = {feld: {"min_value": Decimal("0")} for feld in Anschaffungskosten.BETRAEGE}

    def to_representation(self, instance):
        daten = super().to_representation(instance)
        betraege = {f: Decimal(getattr(instance, f)) for f in Anschaffungskosten.BETRAEGE}
        for name, wert in summen(instance.mietobjekt.kaufpreis, betraege).items():
            daten[name] = str(wert.quantize(Decimal("0.01")))
        return daten

    def validate(self, data):
        # Fields left out keep their stored value. kaufpreis is required, so it is always in data.
        betraege = {f: Decimal(data.get(f, getattr(self.instance, f))) for f in Anschaffungskosten.BETRAEGE}
        if betraege["anteil_grund_boden"] > summen(data["mietobjekt"]["kaufpreis"], betraege)["gesamtkosten"]:
            raise serializers.ValidationError(
                {"anteil_grund_boden": "Der Anteil Grund und Boden darf nicht höher als die Gesamtkosten sein."}
            )
        return data

    # Always called with an instance, also a new unsaved one: the viewset passes it.
    def update(self, instance, validated_data):
        mietobjekt = instance.mietobjekt
        mietobjekt.kaufpreis = validated_data.pop("mietobjekt")["kaufpreis"]
        for feld, wert in validated_data.items():
            setattr(instance, feld, wert)
        with transaction.atomic():
            mietobjekt.save(update_fields=["kaufpreis"])
            instance.save()
        return instance
