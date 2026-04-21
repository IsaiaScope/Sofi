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
        # allauth honors these per-provider URL overrides starting at v0.50+.
        "ACCESS_TOKEN_URL": f"{MOCK_OAUTH_BASE}/google/token",
        "AUTHORIZE_URL": f"{MOCK_OAUTH_BASE}/google/authorize",
        "USERINFO_URL": f"{MOCK_OAUTH_BASE}/google/userinfo",
        "OAUTH2_AUTH_URL": f"{MOCK_OAUTH_BASE}/google/authorize",
        "OAUTH2_ACCESS_TOKEN_URL": f"{MOCK_OAUTH_BASE}/google/token",
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
        "USERINFO_URL": f"{MOCK_OAUTH_BASE}/github/userinfo",
        "OAUTH2_AUTH_URL": f"{MOCK_OAUTH_BASE}/github/authorize",
        "OAUTH2_ACCESS_TOKEN_URL": f"{MOCK_OAUTH_BASE}/github/token",
    },
}
