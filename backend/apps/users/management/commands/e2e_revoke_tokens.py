"""Revoke all Knox tokens for a given email (used by e2e session-expiry spec)."""

from django.core.management.base import BaseCommand
from knox.models import AuthToken

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings
from apps.users.models import User


class Command(BaseCommand):
    help = "Revoke all Knox auth tokens for the given email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_revoke_tokens")

        user = User.objects.filter(email__iexact=opts["email"].strip()).first()
        if not user:
            self.stdout.write("0 tokens revoked (user not found).\n")
            return
        deleted, _ = AuthToken.objects.filter(user=user).delete()
        self.stdout.write(f"{deleted} tokens revoked for {user.email}.\n")
