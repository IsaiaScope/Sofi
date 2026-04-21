"""Smoke tests for the e2e management helpers — fast, no Playwright required."""

import json

from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.users.tests.factories import DEFAULT_TEST_PASSWORD, TEST_EMAIL_SUFFIX
from apps.users.tests.helpers import register_user


def test_e2e_last_email_returns_verification_url(api_client, mailbox, capsys):
    email = f"verify-helper{TEST_EMAIL_SUFFIX}"
    register_user(api_client, email, DEFAULT_TEST_PASSWORD)
    assert len(mailbox) == 1

    call_command("e2e_last_email", "--email", email, "--kind", "verify")

    payload = json.loads(capsys.readouterr().out.strip())
    assert "/accounts/confirm-email/" in payload["url"]
    assert payload["key"]
    assert payload["kind"] == "verify"


def test_e2e_last_email_returns_reset_url(api_client, verified_user, mailbox, capsys):
    api_client.post("/auth/password/reset/", {"email": verified_user.email}, format="json")
    assert len(mailbox) == 1

    call_command("e2e_last_email", "--email", verified_user.email, "--kind", "reset")

    payload = json.loads(capsys.readouterr().out.strip())
    assert "/password-reset/" in payload["url"]
    assert payload["uid"]
    assert payload["token"]
    assert payload["kind"] == "reset"


def test_e2e_last_email_no_match_exits_nonzero(capsys):
    try:
        call_command("e2e_last_email", "--email", "nobody@test.sofi.local", "--kind", "verify")
    except CommandError as exc:
        assert "no email" in str(exc).lower()
    else:
        raise AssertionError("Expected CommandError when mailbox is empty")


def test_e2e_sweep_test_users_deletes_old_test_emails(verified_user, db):
    from datetime import timedelta
    from django.utils import timezone
    from apps.users.models import User

    # Make the verified_user "old" by backdating date_joined.
    User.objects.filter(pk=verified_user.pk).update(date_joined=timezone.now() - timedelta(hours=48))

    assert verified_user.email.endswith(TEST_EMAIL_SUFFIX)
    call_command("e2e_sweep_test_users", "--older-than-hours", "24")

    assert not User.objects.filter(pk=verified_user.pk).exists()


def test_e2e_sweep_test_users_skips_recent(verified_user):
    from apps.users.models import User
    call_command("e2e_sweep_test_users", "--older-than-hours", "24")
    assert User.objects.filter(pk=verified_user.pk).exists()


def test_e2e_sweep_test_users_skips_non_test_emails(db):
    from apps.users.models import User
    real = User.objects.create(email="real-person@example.com", is_active=True)
    call_command("e2e_sweep_test_users", "--older-than-hours", "0")
    assert User.objects.filter(pk=real.pk).exists()
