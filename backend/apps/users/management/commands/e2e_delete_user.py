"""Delete a user row for e2e test teardown.

Case-insensitive match on ``--email``. Refuses to run outside dev/test
settings. Exits 0 even when no row matched (idempotent teardown).
"""

from django.core.management.base import BaseCommand

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings
from apps.users.models import User


class Command(BaseCommand):
    help = "Delete a user (and cascaded rows) for e2e test cleanup."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_delete_user")
        User.objects.filter(email__iexact=opts["email"].strip()).delete()
