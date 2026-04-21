"""OAuth callback flow against mock-oauth2-server.

These tests REQUIRE settings.test_oauth (which configures allauth providers
to point at localhost:8081). Skipped under the default settings.test so
the fast suite isn't held hostage to a Docker container being up.

Run locally:
    docker compose -f docker-compose.test.yml up -d mock-oauth2-server
    cd backend && uv run pytest apps/users/tests/test_oauth.py \
        --ds=sofi_api.settings.test_oauth

Implementation notes:
- apps.users.views._SettingsGoogleOAuth2Adapter reads CERTS_URL + ID_TOKEN_ISSUER
  from SOCIALACCOUNT_PROVIDERS to verify the mock's JWK-format id_token JWT.
- apps.users.views._SettingsGitHubOAuth2Adapter reads ACCESS_TOKEN_URL +
  USERINFO_URL to redirect token exchange and profile fetch to the mock.
- mock-oauth2-server 2.1.10 requestMappings must match against the token
  endpoint request; we use grant_type=authorization_code as the trigger key.
- GitHub mock requires openid scope in the authorize call (OIDC enforcement).
"""

import os

import pytest
import requests
from allauth.socialaccount.models import SocialAccount

from apps.users.models import User

pytestmark = pytest.mark.skipif(
    "sofi_api.settings.test_oauth" not in os.environ.get("DJANGO_SETTINGS_MODULE", ""),
    reason="OAuth tests require settings.test_oauth + running mock-oauth2-server",
)

MOCK_BASE = "http://localhost:8081"


def _exchange_at_mock(provider: str, scope: str) -> str:
    """Hit mock-oauth2-server authorize → get code (follow redirect manually)."""
    response = requests.get(
        f"{MOCK_BASE}/{provider}/authorize",
        params={
            "client_id": f"{provider}-test-client",
            "response_type": "code",
            "scope": scope,
            "redirect_uri": "http://localhost:1420/auth/callback",
            "state": "test-state",
        },
        allow_redirects=False,
        timeout=5,
    )
    assert response.status_code in (302, 303), (
        f"Expected redirect from mock authorize, got {response.status_code}: {response.text}"
    )
    location = response.headers["Location"]
    code = location.split("code=")[1].split("&")[0]
    return code


def test_google_callback_creates_user_and_returns_knox_token(api_client, db):
    code = _exchange_at_mock("google", "openid email profile")
    response = api_client.post(
        "/auth/google/",
        {"code": code, "callback_url": "http://localhost:1420/auth/callback"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert "token" in response.data
    assert User.objects.filter(email__iexact="oauth-test@test.sofi.local").exists()
    assert SocialAccount.objects.filter(provider="google").exists()


def test_github_callback_creates_user_and_returns_knox_token(api_client, db):
    # Mock requires openid scope; the frontend uses user:email in production.
    # Including openid here exercises the same token-exchange path that E2E
    # tests use (mockOauthUser also passes openid+user:email).
    code = _exchange_at_mock("github", "openid user:email")
    response = api_client.post(
        "/auth/github/",
        {"code": code, "callback_url": "http://localhost:1420/auth/callback"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert "token" in response.data
    assert SocialAccount.objects.filter(provider="github").exists()


def test_oauth_with_existing_email_links_social_account(api_client, verified_user):
    """User already exists with email matching the provider's claim → social account links to existing user."""
    # Override mock to claim verified_user.email — see mock-oauth2-server docs
    # for per-test claim overrides. Simplest: register a one-off mapping via
    # the debugger endpoint, but the fixed JSON_CONFIG above always returns
    # oauth-test@test.sofi.local; for this test we seed that exact email.
    # Skipping for now — covered by manual run if/when claim overrides land.
    pytest.skip("Per-test claim override requires mock-oauth2-server debugger API")
