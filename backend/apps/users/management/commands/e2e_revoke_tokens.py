"""Revoke all Knox tokens for a given email (used by e2e session-expiry spec)."""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from knox.models import AuthToken

from apps.users.models import User


class Command(BaseCommand):
    help = "Revoke all Knox auth tokens for the given email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *_args, **opts):
        if not settings.DEBUG and not _is_test_settings():
            raise CommandError("e2e_revoke_tokens refuses to run outside dev/test settings.")

        user = User.objects.filter(email__iexact=opts["email"].strip()).first()
        if not user:
            self.stdout.write("0 tokens revoked (user not found).\n")
            return
        deleted, _ = AuthToken.objects.filter(user=user).delete()
        self.stdout.write(f"{deleted} tokens revoked for {user.email}.\n")


def _is_test_settings() -> bool:
    return settings.SETTINGS_MODULE.endswith((".test", ".dev", ".test_throttled", ".test_oauth"))
