"""Email verification click-through — GET /accounts/confirm-email/<key>/.

``ACCOUNT_CONFIRM_EMAIL_ON_GET = True`` means the GET itself verifies
the address. Anonymous users get redirected to ``/email-verified/`` per
``ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL``.
"""

from allauth.account.models import EmailAddress

from apps.users.tests.factories import DEFAULT_TEST_PASSWORD
from apps.users.tests.helpers import (
    extract_verification_url,
    path_from_verification_url,
    register_user,
    make_test_email,
)


def test_clicking_verification_url_marks_email_verified(api_client, mailbox):
    email = make_test_email("verify-me")
    register = register_user(api_client, email, DEFAULT_TEST_PASSWORD)
    assert register.status_code == 201
    assert len(mailbox) == 1

    verify_url = extract_verification_url(mailbox[0])
    response = api_client.get(path_from_verification_url(verify_url), follow=True)

    assert response.status_code == 200
    assert b"Email verified" in response.content
    assert EmailAddress.objects.get(email__iexact=email).verified is True


def test_verified_user_can_log_in_after_click_through(api_client, mailbox):
    """End-to-end: register → verify via email link → login succeeds."""
    email = make_test_email("flow")
    register_user(api_client, email, DEFAULT_TEST_PASSWORD)
    verify_url = extract_verification_url(mailbox[0])
    api_client.get(path_from_verification_url(verify_url), follow=True)

    login = api_client.post(
        "/auth/login/",
        {"email": email, "password": DEFAULT_TEST_PASSWORD},
        format="json",
    )
    assert login.status_code == 200
    assert "token" in login.data


def test_invalid_verification_key_does_not_crash(api_client):
    response = api_client.get("/accounts/confirm-email/not-a-real-key/", follow=True)
    # allauth renders the "confirm email" form with an error rather than 500.
    assert response.status_code in {200, 404}
