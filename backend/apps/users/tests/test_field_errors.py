"""Guard the {code, field_errors} envelope contract that
``useServerFieldErrors`` (frontend) consumes. If any auth endpoint stops
emitting this shape, the UI silently degrades — these tests fail loudly.
"""

from apps.users.tests.factories import TEST_EMAIL_SUFFIX


def _has_envelope(data) -> bool:
    return isinstance(data, dict) and "code" in data and "field_errors" in data


def test_register_400_has_envelope(api_client):
    response = api_client.post(
        "/auth/registration/",
        {"email": "not-an-email", "password1": "x", "password2": "y"},
        format="json",
    )
    assert response.status_code == 400
    assert _has_envelope(response.data), response.data


def test_login_400_has_envelope(api_client):
    response = api_client.post(
        "/auth/login/",
        {"email": f"missing-password{TEST_EMAIL_SUFFIX}"},
        format="json",
    )
    assert response.status_code == 400
    assert _has_envelope(response.data), response.data


def test_password_reset_confirm_400_has_envelope(api_client):
    response = api_client.post(
        "/auth/password/reset/confirm/",
        {
            "uid": "MQ",
            "token": "bogus",
            "new_password1": "x",
            "new_password2": "y",
        },
        format="json",
    )
    assert response.status_code == 400
    assert _has_envelope(response.data), response.data


def test_resend_email_400_has_envelope(api_client):
    response = api_client.post(
        "/auth/registration/resend-email/",
        {"email": "not-an-email"},
        format="json",
    )
    assert response.status_code == 400
    assert _has_envelope(response.data), response.data
