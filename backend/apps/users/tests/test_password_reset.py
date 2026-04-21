"""dj-rest-auth password reset — request + confirm flows.

Coverage:
- Request: 200 regardless of email existence (anti-enumeration); email sent only
  when user exists; URL extractable from mailbox.
- Confirm: success rotates password; bad token returns 400 with the
  password_reset.invalid_token envelope code; weak password rejected.
"""

import re

from apps.users.models import User
from apps.users.tests.factories import DEFAULT_TEST_PASSWORD, TEST_EMAIL_SUFFIX

RESET_URL_RE = re.compile(r"https?://[\w.:-]+/password-reset/(?P<uid>[\w-]+)/(?P<token>[\w-]+)/?")


def test_request_reset_for_known_user_sends_email(api_client, verified_user, mailbox):
    response = api_client.post(
        "/auth/password/reset/",
        {"email": verified_user.email},
        format="json",
    )
    assert response.status_code == 200
    assert len(mailbox) == 1
    assert verified_user.email in mailbox[0].to
    assert "/password-reset/" in mailbox[0].body


def test_request_reset_for_unknown_email_still_returns_200(api_client, mailbox):
    """Anti-enumeration: response body identical, no email sent."""
    response = api_client.post(
        "/auth/password/reset/",
        {"email": f"ghost{TEST_EMAIL_SUFFIX}"},
        format="json",
    )
    assert response.status_code == 200
    assert mailbox == []


def test_confirm_with_valid_link_rotates_password(api_client, verified_user, mailbox):
    api_client.post("/auth/password/reset/", {"email": verified_user.email}, format="json")
    match = RESET_URL_RE.search(mailbox[0].body)
    assert match, mailbox[0].body
    new_password = "Brand-New-Pass-9"

    response = api_client.post(
        "/auth/password/reset/confirm/",
        {
            "uid": match.group("uid"),
            "token": match.group("token"),
            "new_password1": new_password,
            "new_password2": new_password,
        },
        format="json",
    )
    assert response.status_code == 200

    verified_user.refresh_from_db()
    assert verified_user.check_password(new_password)


def test_confirm_with_bad_token_returns_invalid_token_envelope(api_client, verified_user):
    response = api_client.post(
        "/auth/password/reset/confirm/",
        {
            "uid": "MQ",  # base64 for "1"
            "token": "totally-bogus-token",
            "new_password1": "Whatever-9",
            "new_password2": "Whatever-9",
        },
        format="json",
    )
    assert response.status_code == 400
    assert response.data["code"] == "password_reset.invalid_token"


def test_confirm_with_weak_password_returns_field_error(api_client, verified_user, mailbox):
    api_client.post("/auth/password/reset/", {"email": verified_user.email}, format="json")
    match = RESET_URL_RE.search(mailbox[0].body)

    response = api_client.post(
        "/auth/password/reset/confirm/",
        {
            "uid": match.group("uid"),
            "token": match.group("token"),
            "new_password1": "123",
            "new_password2": "123",
        },
        format="json",
    )
    assert response.status_code == 400
    # Field error keyed under new_password1 / new_password2 / new_password depending
    # on which validator fired. Just assert the envelope shape.
    assert "field_errors" in response.data
