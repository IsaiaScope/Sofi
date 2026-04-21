"""Small helpers shared across auth tests."""

import re
from urllib.parse import urlparse

from apps.users.tests.factories import TEST_EMAIL_SUFFIX

# Matches the verification URL allauth writes into the email body —
# e.g. http://testserver/accounts/confirm-email/KEY/.
_ACTIVATE_URL_RE = re.compile(r"https?://[\w.:-]+/accounts/confirm-email/[\w:.-]+/?")


def extract_verification_url(email_message) -> str:
    """Pull the verification URL out of an EmailMessage body.

    Raises AssertionError if missing — failing loudly beats moving on with None.
    """
    match = _ACTIVATE_URL_RE.search(email_message.body)
    assert match, f"No verification URL in email body:\n{email_message.body}"
    return match.group(0)


def verification_key_from_url(url: str) -> str:
    """Pull just the HMAC key out of /accounts/confirm-email/<key>/."""
    return url.rstrip("/").rsplit("/", 1)[-1]


def path_from_verification_url(url: str) -> str:
    """Return the URL path suitable for ``api_client.get(path, follow=True)``."""
    return urlparse(url).path


def register_user(api_client, email: str, password: str, **extra):
    """POST /auth/registration/ with the standard payload shape."""
    payload = {"email": email, "password1": password, "password2": password, **extra}
    return api_client.post("/auth/registration/", payload, format="json")


def make_test_email(prefix: str) -> str:
    """Return a deterministic test email for ``prefix`` (e.g. ``newbie``)."""
    return f"{prefix}{TEST_EMAIL_SUFFIX}"
