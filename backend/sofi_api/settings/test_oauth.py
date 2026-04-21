"""OAuth-on test settings.

Inherits .test (locmem mail, MD5 hasher, throttles off) and overrides
SOCIALACCOUNT_PROVIDERS to point at the local mock-oauth2-server.
"""

from .test import *  # noqa: F401,F403

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
