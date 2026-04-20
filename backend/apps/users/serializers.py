from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
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
        fields = ("theme", "default_agent_type", "updated_at")
        read_only_fields = ("updated_at",)


class RegisterSerializer(BaseRegisterSerializer):
    """Drops the default `username` field — User uses email as USERNAME_FIELD."""

    username = None
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate_email(self, email):
        # Run the parent check (EmailAddress table) first.
        email = super().validate_email(email)
        # Extra guard: catch orphaned users_user rows that don't have a matching
        # EmailAddress entry (e.g. after a partial manual DB cleanup, or when an
        # OAuth signup wrote User but the EmailAddress was later deleted).
        # Without this, the DB unique-constraint fires mid-insert and the view
        # crashes with IntegrityError instead of returning a clean 400.
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "A user is already registered with this e-mail address.",
            )
        return email

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
