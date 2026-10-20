from django.contrib import admin
from django.urls import include, path
from .views.mietobjekt import MietobjektViewSet
from .views.einheit import EinheitViewSet

urlpatterns = [
    path('mietobjekte/', MietobjektViewSet.as_view({'get': 'list', 'post': 'create'}), name='mietobjekte-list'),
    path('einheiten/', EinheitViewSet.as_view({'get': 'list', 'post': 'create'}), name='einheiten-list'),
    path('auth/', include('rest_framework.urls')),
]
