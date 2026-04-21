"""Sweep stale @test.sofi.local users left behind by aborted e2e runs."""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.users.models import User

TEST_EMAIL_SUFFIX = "@test.sofi.local"


class Command(BaseCommand):
    help = "Delete stale @test.sofi.local users older than --older-than-hours."

    def add_arguments(self, parser):
        parser.add_argument("--older-than-hours", type=int, required=True)

    def handle(self, *_args, **opts):
        if not settings.DEBUG and not _is_test_settings():
            raise CommandError("e2e_sweep_test_users refuses to run outside dev/test settings.")

        cutoff = timezone.now() - timedelta(hours=opts["older_than_hours"])
        qs = User.objects.filter(email__iendswith=TEST_EMAIL_SUFFIX, date_joined__lt=cutoff)
        deleted, _ = qs.delete()
        self.stdout.write(f"Deleted {deleted} stale test users.\n")


def _is_test_settings() -> bool:
    return settings.SETTINGS_MODULE.endswith((".test", ".dev", ".test_throttled", ".test_oauth"))
