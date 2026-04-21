"""Seed a user for e2e tests.

Default: creates a verified user. Pass ``--unverified`` to leave the
primary email unverified (used by the resend-verification spec).

Idempotent: if the email already exists, resets password + verification
state. Refuses to run outside dev/test settings.

Emits JSON on stdout so ``auth.setup.ts`` can consume it.
"""

import json
import sys

from allauth.account.models import EmailAddress
from django.core.management.base import BaseCommand

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings
from apps.users.models import User


class Command(BaseCommand):
    help = "Create or update a user for e2e tests."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--display-name", default="E2E User")
        parser.add_argument(
            "--unverified",
            action="store_true",
            help="Leave the primary email unverified (default: verified).",
        )

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_seed_user")

        email: str = opts["email"].strip()
        password: str = opts["password"]
        display_name: str = opts["display_name"]
        verified: bool = not opts["unverified"]

        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            user = User(email=email)
        user.display_name = display_name
        user.is_active = True
        user.set_password(password)
        user.save()

        EmailAddress.objects.update_or_create(
            user=user,
            email=email,
            defaults={"primary": True, "verified": verified},
        )

        payload = {
            "email": user.email,
            "password": password,
            "display_name": user.display_name,
            "verified": verified,
            "created": created,
        }
        sys.stdout.write(json.dumps(payload) + "\n")
