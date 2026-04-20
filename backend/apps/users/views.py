"""Custom auth views that bridge dj-rest-auth's contract to Knox's token model.

Knox supports multiple tokens per user (reverse relation `auth_token_set`), while
dj-rest-auth's defaults assume a single `user.auth_token` (DRF-authtoken style).
We issue a fresh Knox token on each successful login / register / social-login
and return it in the response body.
"""

from allauth.account.models import EmailAddress
from allauth.account.utils import complete_signup
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import RegisterView, SocialLoginView
from dj_rest_auth.views import LoginView
from django.conf import settings
from knox.models import AuthToken
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserSettings
from .serializers import ApiTokenSerializer, UserSerializer, UserSettingsSerializer


def _issue_knox_token(user, request) -> dict:
    instance, token = AuthToken.objects.create(user)
    return {
        "token": token,
        "expiry": instance.expiry.isoformat() if instance.expiry else None,
        "user": UserSerializer(user, context={"request": request}).data,
    }


class KnoxIssueMixin:
    """Override dj-rest-auth's `get_response` to mint a Knox token instead."""

    def get_response(self):
        return Response(_issue_knox_token(self.user, self.request))


class DynamicCallbackMixin:
    """Read `callback_url` from the request body.

    Desktop clients pick an ephemeral loopback port per sign-in; the callback URL
    differs every time. dj-rest-auth's SocialLoginSerializer reads
    `view.callback_url`, so we expose it as a property that pulls from the body.
    """

    @property
    def callback_url(self) -> str:
        return self.request.data.get("callback_url", "")


class KnoxLoginView(KnoxIssueMixin, LoginView):
    def post(self, request, *args, **kwargs):
        # Surface a typed `code` so the client can branch on the unverified-email
        # case without string-matching allauth's "E-mail is not verified." message.
        if getattr(settings, "ACCOUNT_EMAIL_VERIFICATION", "optional") == "mandatory":
            email = (request.data.get("email") or "").strip()
            if email:
                primary = (
                    EmailAddress.objects.filter(email__iexact=email, primary=True).first()
                )
                if primary and not primary.verified:
                    return Response(
                        {
                            "code": "email_not_verified",
                            "detail": "E-mail is not verified.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        return super().post(request, *args, **kwargs)


class KnoxRegisterView(RegisterView):
    def get_response_data(self, user):
        # When email verification is mandatory, never issue a token alongside the
        # "e-mail sent" response — the token would defeat the point of verification.
        # Mirror dj-rest-auth's native contract: {"detail": "Verification e-mail sent."}.
        if getattr(settings, "ACCOUNT_EMAIL_VERIFICATION", "optional") == "mandatory":
            primary = EmailAddress.objects.filter(user=user, primary=True).first()
            if primary is None or not primary.verified:
                return {"detail": "Verification e-mail sent."}
        return _issue_knox_token(user, self.request)

    def perform_create(self, serializer):
        # `serializer.save()` writes the User + EmailAddress rows, but the
        # verification email is sent by allauth's `complete_signup()` — which
        # dj-rest-auth's default perform_create runs. Mirror that call here
        # so the signup flow matches the Resend endpoint (both end up in
        # send_email_confirmation()).
        user = serializer.save(self.request)
        complete_signup(
            self.request._request,
            user,
            getattr(settings, "ACCOUNT_EMAIL_VERIFICATION", "optional"),
            None,
        )
        return user


class GoogleLogin(DynamicCallbackMixin, KnoxIssueMixin, SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client


class GitHubLogin(DynamicCallbackMixin, KnoxIssueMixin, SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    client_class = OAuth2Client


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApiTokenViewSet(viewsets.ViewSet):
    """Named API tokens for the current user.

    POST returns the plaintext key **once** — clients must store it immediately.
    GET lists token metadata only (digest, created, expiry) — the key is never
    recoverable after creation.
    """

    serializer_class = ApiTokenSerializer

    def list(self, request):
        tokens = AuthToken.objects.filter(user=request.user).order_by("-created")
        return Response(ApiTokenSerializer(tokens, many=True).data)

    def create(self, request):
        instance, plaintext = AuthToken.objects.create(request.user)
        data = ApiTokenSerializer(instance).data
        data["token"] = plaintext  # shown once, never again
        return Response(data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        deleted, _ = AuthToken.objects.filter(user=request.user, digest=pk).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
        return Response(UserSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
