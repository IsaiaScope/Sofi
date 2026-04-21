"""Sweep stale @test.sofi.local users left behind by aborted e2e runs."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings
from apps.users.models import User
from apps.users.tests.factories import TEST_EMAIL_SUFFIX


class Command(BaseCommand):
    help = "Delete stale @test.sofi.local users older than --older-than-hours."

    def add_arguments(self, parser):
        parser.add_argument("--older-than-hours", type=int, required=True)

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_sweep_test_users")

        cutoff = timezone.now() - timedelta(hours=opts["older_than_hours"])
        qs = User.objects.filter(email__iendswith=TEST_EMAIL_SUFFIX, date_joined__lt=cutoff)
        deleted, _ = qs.delete()
        self.stdout.write(f"Deleted {deleted} stale test users.\n")
