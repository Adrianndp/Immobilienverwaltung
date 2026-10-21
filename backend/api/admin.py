from django.contrib import admin

from .models import Mieter, Mietvertrag


@admin.register(Mieter)
class MieterAdmin(admin.ModelAdmin):
    list_display = ["nachname", "vorname", "ort", "eigentuemer"]
    search_fields = ["nachname", "vorname", "email"]


@admin.register(Mietvertrag)
class MietvertragAdmin(admin.ModelAdmin):
    list_display = ["mieter", "einheit", "beginn", "ende", "kaltmiete"]
    list_select_related = ["mieter", "einheit"]
