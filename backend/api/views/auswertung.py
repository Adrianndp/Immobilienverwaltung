import calendar
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, DecimalField, F, Sum
from django.db.models.functions import Round
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Kostenart, Mietobjekt, RechnungsAnteil, Zuordnung


def betrag(wert):
    return str(wert.quantize(Decimal("0.01")))


def runden(wert):
    # Same rounding as Postgres ROUND(), which the aggregations use.
    return wert.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class DeckungsbeitragView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            mietobjekt_id = int(request.query_params["mietobjekt"])
            jahr = int(request.query_params["jahr"])
            monat = int(request.query_params["monat"]) if request.query_params.get("monat") else None
            if monat is None:
                von, bis = date(jahr, 1, 1), date(jahr, 12, 31)
            else:
                von = date(jahr, monat, 1)
                bis = date(jahr, monat, calendar.monthrange(jahr, monat)[1])
        except (KeyError, ValueError):
            return Response(
                {"detail": "Parameter mietobjekt und jahr (und optional monat) als Zahl angeben."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mietobjekt = get_object_or_404(Mietobjekt, pk=mietobjekt_id, eigentuemer=request.user)

        zuordnungen = Zuordnung.objects.filter(
            mietvertrag__einheit__mietobjekt=mietobjekt, buchung__buchungstag__year=jahr
        )
        anteile = RechnungsAnteil.objects.filter(mietobjekt=mietobjekt, rechnung__datum__year=jahr)
        if monat is not None:
            zuordnungen = zuordnungen.filter(buchung__buchungstag__month=monat)
            anteile = anteile.filter(rechnung__datum__month=monat)

        einnahmen = (
            zuordnungen.values(
                "mietvertrag",
                "mietvertrag__mieter__vorname",
                "mietvertrag__mieter__nachname",
                "mietvertrag__einheit__name",
            )
            .annotate(summe=Sum("betrag"))
            .order_by("-summe", "mietvertrag__mieter__nachname")
        )
        ausgaben = (
            anteile.values("rechnung__kostenart__name")
            .annotate(
                summe=Sum(
                    Round(F("rechnung__betrag") * F("prozent") / Decimal("100"), 2),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )
            .order_by("-summe", "rechnung__kostenart__name")
        )
        ausgaben = [{"kostenart": a["rechnung__kostenart__name"], "summe": a["summe"]} for a in ausgaben]
        schuldzinsen = sum((d.zinsen(von, bis) for d in mietobjekt.darlehen.all()), Decimal("0"))
        if schuldzinsen > 0:
            ausgaben.append({"kostenart": "Schuldzinsen", "summe": schuldzinsen})
            ausgaben.sort(key=lambda a: a["summe"], reverse=True)

        einnahmen_summe = sum((e["summe"] for e in einnahmen), Decimal("0"))
        ausgaben_summe = sum((a["summe"] for a in ausgaben), Decimal("0"))
        return Response(
            {
                "einnahmen": [
                    {
                        "label": f"{e['mietvertrag__mieter__vorname']} {e['mietvertrag__mieter__nachname']}"
                        f" – {e['mietvertrag__einheit__name']}",
                        "betrag": betrag(e["summe"]),
                    }
                    for e in einnahmen
                ],
                "einnahmen_summe": betrag(einnahmen_summe),
                "ausgaben": [
                    {"kostenart": a["kostenart"], "betrag": betrag(a["summe"])} for a in ausgaben
                ],
                "ausgaben_summe": betrag(ausgaben_summe),
                "ergebnis": betrag(einnahmen_summe - ausgaben_summe),
            }
        )


class AnlageVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            mietobjekt_id = int(request.query_params["mietobjekt"])
            jahr = int(request.query_params["jahr"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "Parameter mietobjekt und jahr als Zahl angeben."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mietobjekt = get_object_or_404(Mietobjekt, pk=mietobjekt_id, eigentuemer=request.user)

        # I. Einnahmen, by payment date.
        einnahmen = []
        for e in (
            Zuordnung.objects.filter(mietvertrag__einheit__mietobjekt=mietobjekt, buchung__buchungstag__year=jahr)
            .values(
                "mietvertrag",
                "mietvertrag__mieter__vorname",
                "mietvertrag__mieter__nachname",
                "mietvertrag__einheit__name",
                "mietvertrag__kaltmiete",
                "mietvertrag__nebenkosten",
            )
            .annotate(gesamt=Sum("betrag"), anzahl=Count("buchung", distinct=True))
            .order_by("-gesamt", "mietvertrag__mieter__nachname")
        ):
            kalt, nk = e["mietvertrag__kaltmiete"], e["mietvertrag__nebenkosten"]
            kaltmiete = runden(e["gesamt"] * kalt / (kalt + nk)) if kalt + nk else e["gesamt"]
            einnahmen.append(
                {
                    "label": f"{e['mietvertrag__mieter__vorname']} {e['mietvertrag__mieter__nachname']}"
                    f" – {e['mietvertrag__einheit__name']}",
                    "anzahl_zahlungen": e["anzahl"],
                    "kaltmiete": kaltmiete,
                    # Remainder, so that kaltmiete + nebenkosten is exactly gesamt.
                    "nebenkosten": e["gesamt"] - kaltmiete,
                    "gesamt": e["gesamt"],
                }
            )

        # II. 2./3. Paid Rechnungen, by payment date, with this Mietobjekt's share.
        def bezahlt(kategorie):
            summe = Zuordnung.objects.filter(
                rechnung__kostenart__kategorie=kategorie,
                rechnung__anteile__mietobjekt=mietobjekt,
                buchung__buchungstag__year=jahr,
            ).aggregate(
                summe=Sum(
                    Round(F("betrag") * F("rechnung__anteile__prozent") / Decimal("100"), 2),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )["summe"]
            return summe or Decimal("0")

        instandhaltung = bezahlt(Kostenart.Kategorie.INSTANDHALTUNG)
        sonstige = bezahlt(Kostenart.Kategorie.SONSTIGE)

        # II. 4. Full-year straight-line depreciation by invoice year, independent of payments.
        abschreibungen = Decimal("0")
        for a in RechnungsAnteil.objects.filter(
            mietobjekt=mietobjekt,
            rechnung__kostenart__kategorie=Kostenart.Kategorie.ABSCHREIBUNG,
            rechnung__datum__year__lte=jahr,
        ).select_related("rechnung__kostenart"):
            anteil = runden(a.rechnung.betrag * a.prozent / 100)
            jahresbetrag = runden(anteil * a.rechnung.kostenart.abschreibung_prozent / 100)
            bereits = (jahr - a.rechnung.datum.year) * jahresbetrag
            abschreibungen += max(Decimal("0"), min(jahresbetrag, anteil - bereits))

        schuldzinsen = sum(
            (d.zinsen(date(jahr, 1, 1), date(jahr, 12, 31)) for d in mietobjekt.darlehen.all()), Decimal("0")
        )
        einnahmen_summe = sum((e["gesamt"] for e in einnahmen), Decimal("0"))
        werbungskosten_summe = schuldzinsen + instandhaltung + sonstige + abschreibungen
        return Response(
            {
                "einnahmen": [
                    {
                        **e,
                        "kaltmiete": betrag(e["kaltmiete"]),
                        "nebenkosten": betrag(e["nebenkosten"]),
                        "gesamt": betrag(e["gesamt"]),
                    }
                    for e in einnahmen
                ],
                "einnahmen_summe": betrag(einnahmen_summe),
                "kaltmiete_summe": betrag(sum((e["kaltmiete"] for e in einnahmen), Decimal("0"))),
                "nebenkosten_summe": betrag(sum((e["nebenkosten"] for e in einnahmen), Decimal("0"))),
                "schuldzinsen": betrag(schuldzinsen),
                "instandhaltung": betrag(instandhaltung),
                "sonstige": betrag(sonstige),
                "abschreibungen": betrag(abschreibungen),
                "werbungskosten_summe": betrag(werbungskosten_summe),
                "ueberschuss": betrag(einnahmen_summe - werbungskosten_summe),
            }
        )
