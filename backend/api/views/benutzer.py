from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


def benutzer_daten(user):
    return {"username": user.username, "first_name": user.first_name, "last_name": user.last_name}


class BenutzerView(APIView):
    """The logged-in user, for the greeting in the sidebar."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(benutzer_daten(request.user))


# DRF only checks CSRF for logged-in sessions, so the login itself needs Django's check.
@method_decorator([ensure_csrf_cookie, csrf_protect], name="dispatch")
class AnmeldenView(APIView):
    """Session login for the login page. GET sets the CSRF cookie the POST needs."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"angemeldet": request.user.is_authenticated})

    def post(self, request):
        user = authenticate(
            request, username=request.data.get("username", ""), password=request.data.get("password", "")
        )
        if user is None:
            return Response(
                {"detail": "Benutzername oder Passwort ist falsch."}, status=status.HTTP_400_BAD_REQUEST
            )
        login(request, user)
        return Response(benutzer_daten(user))


class AbmeldenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
