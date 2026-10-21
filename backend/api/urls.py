from django.contrib import admin
from django.urls import include, path
from .views.mietobjekt import MietobjektViewSet
from .views.einheit import EinheitViewSet
from .views.mietvertrag import MietvertragViewSet
from .views.kostenart import KostenartViewSet
from .views.lieferant import LieferantViewSet
from .views.rechnung import RechnungViewSet
from .views.buchung import BuchungViewSet
from .views.auswertung import AnlageVView, DeckungsbeitragView

DETAIL = {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}

urlpatterns = [
    path('mietobjekte/', MietobjektViewSet.as_view({'get': 'list', 'post': 'create'}), name='mietobjekte-list'),
    path('mietobjekte/<int:pk>/', MietobjektViewSet.as_view(DETAIL), name='mietobjekte-detail'),
    path('einheiten/', EinheitViewSet.as_view({'get': 'list', 'post': 'create'}), name='einheiten-list'),
    path('einheiten/<int:pk>/', EinheitViewSet.as_view(DETAIL), name='einheiten-detail'),
    path('mietvertraege/', MietvertragViewSet.as_view({'get': 'list', 'post': 'create'}), name='mietvertraege-list'),
    path('mietvertraege/<int:pk>/', MietvertragViewSet.as_view(DETAIL), name='mietvertraege-detail'),
    path('kostenarten/', KostenartViewSet.as_view({'get': 'list', 'post': 'create'}), name='kostenarten-list'),
    path('kostenarten/<int:pk>/', KostenartViewSet.as_view(DETAIL), name='kostenarten-detail'),
    path('lieferanten/', LieferantViewSet.as_view({'get': 'list', 'post': 'create'}), name='lieferanten-list'),
    path('lieferanten/<int:pk>/', LieferantViewSet.as_view(DETAIL), name='lieferanten-detail'),
    path('rechnungen/', RechnungViewSet.as_view({'get': 'list', 'post': 'create'}), name='rechnungen-list'),
    path('rechnungen/<int:pk>/', RechnungViewSet.as_view(DETAIL), name='rechnungen-detail'),
    path('buchungen/', BuchungViewSet.as_view({'get': 'list'}), name='buchungen-list'),
    path('buchungen/import/', BuchungViewSet.as_view({'post': 'importieren'}), name='buchungen-import'),
    path('buchungen/<int:pk>/', BuchungViewSet.as_view({'patch': 'partial_update'}), name='buchungen-detail'),
    path('auswertung/deckungsbeitrag/', DeckungsbeitragView.as_view(), name='auswertung-deckungsbeitrag'),
    path('auswertung/anlage-v/', AnlageVView.as_view(), name='auswertung-anlage-v'),
    path('auth/', include('rest_framework.urls')),
]
