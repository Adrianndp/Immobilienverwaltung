from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class BenutzerView(APIView):
    """The logged-in user, for the greeting in the sidebar."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({"username": user.username, "first_name": user.first_name, "last_name": user.last_name})
