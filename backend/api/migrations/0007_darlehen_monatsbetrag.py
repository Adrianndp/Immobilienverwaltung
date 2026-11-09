from decimal import ROUND_HALF_UP, Decimal

from django.db import migrations, models


def tilgung_zu_monatsbetrag(apps, schema_editor):
    # The amount the old Tilgungsplan used, so existing plans stay exactly the same:
    # Annuität = Betrag × (Sollzins + Tilgung) / 12, Tilgungsdarlehen = Betrag × Tilgung / 12.
    Darlehen = apps.get_model("api", "Darlehen")
    for d in Darlehen.objects.all():
        prozent = d.sollzins + d.tilgung if d.art == "ANNUITAET" else d.tilgung
        d.monatsbetrag = (d.betrag * prozent / 100 / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        d.save(update_fields=["monatsbetrag"])


def monatsbetrag_zu_tilgung(apps, schema_editor):
    # The inverse of the above (up to rounding).
    Darlehen = apps.get_model("api", "Darlehen")
    for d in Darlehen.objects.all():
        prozent = d.monatsbetrag * 12 * 100 / d.betrag
        if d.art == "ANNUITAET":
            prozent -= d.sollzins
        d.tilgung = prozent.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        d.save(update_fields=["tilgung"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_zimmer_dezimal"),
    ]

    operations = [
        migrations.AddField(
            model_name="darlehen",
            name="monatsbetrag",
            field=models.DecimalField(decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name="darlehen",
            name="tilgung",
            field=models.DecimalField(decimal_places=3, max_digits=5, null=True),
        ),
        migrations.RunPython(tilgung_zu_monatsbetrag, monatsbetrag_zu_tilgung),
        migrations.RemoveField(
            model_name="darlehen",
            name="tilgung",
        ),
        migrations.AlterField(
            model_name="darlehen",
            name="monatsbetrag",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
    ]
