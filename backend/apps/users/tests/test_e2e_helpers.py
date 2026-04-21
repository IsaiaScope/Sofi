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
