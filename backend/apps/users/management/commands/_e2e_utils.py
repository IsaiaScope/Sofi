"""Shared utilities for the e2e_* management commands.

Centralizes the test/dev settings guard so the allowlist stays consistent
across every command. If you're adding a new e2e_* command, use
`assert_test_or_dev_settings(...)` in its `handle()` instead of rolling
your own check.
"""

from django.conf import settings
from django.core.management.base import CommandError

ALLOWED_SUFFIXES = (".test", ".dev", ".test_throttled", ".test_oauth")


def assert_test_or_dev_settings(command_name: str) -> None:
    if not settings.DEBUG and not settings.SETTINGS_MODULE.endswith(ALLOWED_SUFFIXES):
        raise CommandError(f"{command_name} refuses to run outside dev/test settings.")
