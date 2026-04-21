"""Login flow — POST /auth/login/.

- Verified user + correct password → 200 with Knox token + user payload.
- Unverified user → 400 with typed code "auth.email_not_verified" (the contract
  the frontend's ``AppErrorKind.EMAIL_NOT_VERIFIED`` check relies on).
- Wrong password / wrong email → 400 with no enumeration-leaking signal.
"""

from apps.users.tests.factories import DEFAULT_TEST_PASSWORD

LOGIN_URL = "/auth/login/"


def test_login_with_verified_user_returns_knox_token(
    api_client, verified_user_with_password
):
    user, password = verified_user_with_password
    response = api_client.post(
        LOGIN_URL, {"email": user.email, "password": password}, format="json"
    )

    assert response.status_code == 200
    assert "token" in response.data
    assert len(response.data["token"]) == 64  # Knox plaintext key length.
    assert response.data["user"]["email"] == user.email


def test_login_with_unverified_user_returns_typed_code(api_client, unverified_user):
    response = api_client.post(
        LOGIN_URL,
        {"email": unverified_user.email, "password": DEFAULT_TEST_PASSWORD},
        format="json",
    )

    assert response.status_code == 400
    # Custom KnoxLoginView adds this `code` field so the frontend can branch
    # on AppErrorKind.EMAIL_NOT_VERIFIED without string-matching the detail.
    assert response.data["code"] == "auth.email_not_verified"
    assert "not verified" in response.data["detail"].lower()
    assert "token" not in response.data


def test_login_wrong_password_rejects(api_client, verified_user_with_password):
    user, _ = verified_user_with_password
    response = api_client.post(
        LOGIN_URL, {"email": user.email, "password": "WrongPassword1"}, format="json"
    )

    assert response.status_code == 400
    assert "token" not in response.data


def test_login_nonexistent_email_rejects(api_client):
    response = api_client.post(
        LOGIN_URL,
        {"email": "nobody@test.sofi.local", "password": "Whatever123!"},
        format="json",
    )

    assert response.status_code == 400
    assert "token" not in response.data
