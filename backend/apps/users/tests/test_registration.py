"""Registration flow — POST /auth/registration/.

Coverage
--------
- Happy path: creates User + unverified EmailAddress + sends verification email.
- Response shape under mandatory verification: {"detail": "Verification e-mail sent."}
  with NO token (the whole point of verification).
- Duplicate email: returns 400 with a message pointing to email, no second user.
- Password mismatch: returns 400 with field-specific message.
- Weak password: rejected by allauth validators.

These tests run against the real DB + real allauth/dj-rest-auth stack —
the only thing mocked is the email transport (locmem).
"""

from allauth.account.models import EmailAddress

from apps.users.models import User
from apps.users.tests.factories import TEST_EMAIL_SUFFIX


def test_register_creates_user_and_sends_verification_email(api_client, mailbox):
    response = api_client.post(
        "/auth/registration/",
        {
            "email": f"newbie{TEST_EMAIL_SUFFIX}",
            "password1": "Correct-Horse-Battery-9",
            "password2": "Correct-Horse-Battery-9",
            "display_name": "Newbie",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data == {"detail": "Verification e-mail sent."}
    # Crucially NOT a token response — if this ever starts returning a
    # token, mandatory verification is silently bypassed.
    assert "token" not in response.data

    user = User.objects.get(email__iexact=f"newbie{TEST_EMAIL_SUFFIX}")
    assert user.display_name == "Newbie"

    email = EmailAddress.objects.get(user=user)
    assert email.primary is True
    assert email.verified is False

    # Exactly one verification email sent (this is the bug that motivated
    # the whole post-session conversation — guard against it).
    assert len(mailbox) == 1
    assert mailbox[0].to == [user.email]
    assert "/accounts/confirm-email/" in mailbox[0].body


def test_register_rejects_duplicate_email(api_client, verified_user, mailbox):
    response = api_client.post(
        "/auth/registration/",
        {
            "email": verified_user.email,
            "password1": "Correct-Horse-Battery-9",
            "password2": "Correct-Horse-Battery-9",
        },
        format="json",
    )

    assert response.status_code == 400
    # Exception handler envelope: top-level `code` plus per-field semantic
    # codes so the UI can highlight the email input.
    assert response.data["code"] == "auth.email_already_registered"
    assert response.data["field_errors"]["email"] == ["auth.email_already_registered"]
    # No duplicate user was created.
    assert User.objects.filter(email__iexact=verified_user.email).count() == 1
    # No second verification email went out.
    assert len(mailbox) == 0


def test_register_rejects_mismatched_passwords(api_client, mailbox):
    response = api_client.post(
        "/auth/registration/",
        {
            "email": f"mismatch{TEST_EMAIL_SUFFIX}",
            "password1": "Correct-Horse-Battery-9",
            "password2": "Different-Password-9",
        },
        format="json",
    )

    assert response.status_code == 400
    assert not User.objects.filter(email__iexact=f"mismatch{TEST_EMAIL_SUFFIX}").exists()
    assert len(mailbox) == 0


def test_register_rejects_weak_password(api_client, mailbox):
    response = api_client.post(
        "/auth/registration/",
        {
            "email": f"weak{TEST_EMAIL_SUFFIX}",
            "password1": "123",
            "password2": "123",
        },
        format="json",
    )

    assert response.status_code == 400
    assert not User.objects.filter(email__iexact=f"weak{TEST_EMAIL_SUFFIX}").exists()
    assert len(mailbox) == 0
