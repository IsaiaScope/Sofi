"""Delete a user row for e2e test teardown.

Case-insensitive match on ``--email``. Refuses to run outside dev/test
settings. Exits 0 even when no row matched (idempotent teardown).
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.users.models import User


class Command(BaseCommand):
    help = "Delete a user (and cascaded rows) for e2e test cleanup."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *_args, **opts):
        if not settings.DEBUG and not _is_test_settings():
            raise CommandError(
                "e2e_delete_user refuses to run outside dev/test settings."
            )
        User.objects.filter(email__iexact=opts["email"].strip()).delete()


def _is_test_settings() -> bool:
    return settings.SETTINGS_MODULE.endswith((".test", ".dev"))
