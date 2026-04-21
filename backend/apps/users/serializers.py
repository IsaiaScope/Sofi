from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from django.utils.translation import gettext_lazy as _
from knox.models import AuthToken
from rest_framework import serializers

from .models import User, UserSettings


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "display_name", "date_joined")
        read_only_fields = ("id", "email", "date_joined")


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ("theme", "locale", "default_agent_type", "updated_at")
        read_only_fields = ("updated_at",)


class RegisterSerializer(BaseRegisterSerializer):
    """Drops the default `username` field — User uses email as USERNAME_FIELD."""

    username = None
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate_email(self, email):
        # Check User table first so duplicate emails — whether caused by an
        # orphaned User row OR a normal EmailAddress-backed account — always
        # raise with `code="unique"`. If we delegated to super() first, allauth
        # would raise its own ValidationError with the default `"invalid"`
        # code and our exception handler couldn't classify it as
        # `auth.email_already_registered`.
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                _("A user is already registered with this e-mail address."),
                code="unique",
            )
        # Delegate remaining format + adapter checks (MX validation etc.) to
        # the dj-rest-auth base serializer.
        return super().validate_email(email)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["display_name"] = self.validated_data.get("display_name", "")
        return data

    def save(self, request):
        user = super().save(request)
        display_name = self.validated_data.get("display_name", "")
        if display_name:
            user.display_name = display_name
            user.save(update_fields=["display_name"])
        return user


class ApiTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthToken
        fields = ("digest", "token_key", "created", "expiry")
        read_only_fields = fields
