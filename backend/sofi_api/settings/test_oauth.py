"""OAuth-on test settings.

Inherits .test (MD5 hasher, throttles off) and overrides
SOCIALACCOUNT_PROVIDERS to point at the local mock-oauth2-server.

Uses the filebased email backend (same path as .e2e) so Playwright's
e2e_last_email subprocess can read verification/reset emails that were
sent by the Django webserver process — locmem wouldn't be visible
cross-process. Backend pytest against this module reads mail via
mail.outbox-style APIs only indirectly (test_oauth.py doesn't assert on
mail at all), so the filebased backend is safe here.
"""

import os

from .test import *  # noqa: F401,F403

EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
EMAIL_FILE_PATH = os.environ.get("E2E_MAIL_DIR", "/tmp/sofi-e2e-mail")

MOCK_OAUTH_BASE = "http://localhost:8081"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": "google-test-client",
            "secret": "google-test-secret",
            "key": "",
        },
        "OAUTH_PKCE_ENABLED": False,
        "SCOPE": ["openid", "email", "profile"],
        "AUTH_PARAMS": {"access_type": "online"},
        "ACCESS_TOKEN_URL": f"{MOCK_OAUTH_BASE}/google/token",
        "AUTHORIZE_URL": f"{MOCK_OAUTH_BASE}/google/authorize",
        "USERINFO_URL": f"{MOCK_OAUTH_BASE}/google/userinfo",
        # _SettingsGoogleOAuth2Adapter reads these two keys to verify id_token JWTs
        # using the mock's JWK endpoint instead of Google's X.509-certificate JWKS.
        "CERTS_URL": f"{MOCK_OAUTH_BASE}/google/jwks",
        "ID_TOKEN_ISSUER": f"{MOCK_OAUTH_BASE}/google",
    },
    "github": {
        "APP": {
            "client_id": "github-test-client",
            "secret": "github-test-secret",
            "key": "",
        },
        "SCOPE": ["user:email"],
        "ACCESS_TOKEN_URL": f"{MOCK_OAUTH_BASE}/github/token",
        "AUTHORIZE_URL": f"{MOCK_OAUTH_BASE}/github/authorize",
        # _SettingsGitHubOAuth2Adapter reads USERINFO_URL to call mock's OIDC
        # userinfo endpoint instead of the real GitHub /user API.
        "USERINFO_URL": f"{MOCK_OAUTH_BASE}/github/userinfo",
    },
}
