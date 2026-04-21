"""Resend verification email — POST /auth/registration/resend-email/.

- For an unverified user: sends a new verification email.
- For a verified user: dj-rest-auth silently no-ops (anti-enumeration).
- For a nonexistent email: same no-op (same anti-enumeration reason).
- The endpoint is unauthenticated by design — anyone who knows an email
  address can trigger a resend.
"""


def test_resend_sends_fresh_email_for_unverified_user(
    api_client, unverified_user, mailbox
):
    response = api_client.post(
        "/auth/registration/resend-email/",
        {"email": unverified_user.email},
        format="json",
    )

    assert response.status_code == 200
    assert len(mailbox) == 1
    assert mailbox[0].to == [unverified_user.email]
    assert "/accounts/confirm-email/" in mailbox[0].body


def test_resend_for_verified_user_does_not_send(api_client, verified_user, mailbox):
    """Anti-enumeration: the response is identical whether the email is
    verified or not. Only the outbox tells the difference server-side."""
    response = api_client.post(
        "/auth/registration/resend-email/",
        {"email": verified_user.email},
        format="json",
    )

    assert response.status_code == 200
    # No email sent — nothing to verify.
    assert len(mailbox) == 0


def test_resend_for_unknown_email_does_not_send(api_client, mailbox):
    """Anti-enumeration for unknown addresses."""
    response = api_client.post(
        "/auth/registration/resend-email/",
        {"email": "ghost@test.sofi.local"},
        format="json",
    )

    assert response.status_code == 200
    assert len(mailbox) == 0


def test_resend_rejects_missing_email(api_client, mailbox):
    response = api_client.post(
        "/auth/registration/resend-email/", {}, format="json"
    )

    assert response.status_code == 400
    assert len(mailbox) == 0
