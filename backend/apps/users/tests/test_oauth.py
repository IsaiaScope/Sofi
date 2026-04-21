"""OAuth callback flow against mock-oauth2-server.

These tests REQUIRE settings.test_oauth (which configures allauth providers
to point at localhost:8081). Skipped under the default settings.test so
the fast suite isn't held hostage to a Docker container being up.

Run locally:
    docker compose -f docker-compose.test.yml up -d mock-oauth2-server
    cd backend && uv run pytest apps/users/tests/test_oauth.py \
        --ds=sofi_api.settings.test_oauth

Implementation notes:
- allauth's GoogleOAuth2Adapter verifies the id_token JWT using JWKS. The
  mock exposes JWK-format keys (not X.509 certificates), so we swap in a
  subclass that uses jwtkit.lookup_kid_jwk + the mock's JWKS URL.
- allauth's GitHubOAuth2Adapter hardcodes github.com endpoints; a subclass
  redirects it to mock-oauth2-server and calls the OIDC userinfo endpoint
  instead of the GitHub API /user route.
"""

import os

import pytest
import requests
from allauth.socialaccount.internal import jwtkit
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.models import SocialAccount

from apps.users.models import User

pytestmark = pytest.mark.skipif(
    "sofi_api.settings.test_oauth" not in os.environ.get("DJANGO_SETTINGS_MODULE", ""),
    reason="OAuth tests require settings.test_oauth + running mock-oauth2-server",
)

MOCK_BASE = "http://localhost:8081"


# ---------------------------------------------------------------------------
# Custom adapters that talk to the mock instead of real providers.
# ---------------------------------------------------------------------------


class MockGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    """Google adapter wired to mock-oauth2-server.

    The mock signs tokens with an RSA key exposed as a JWK (not an X.509
    cert). Allauth's default `_verify_and_decode` uses
    `lookup_kid_pem_x509_certificate` which only handles the cert format.
    We override `_decode_id_token` to use `lookup_kid_jwk` instead.

    All URL overrides are read from test_oauth.py settings at adapter
    construction time via the `access_token_url` / `authorize_url`
    class attributes.
    """

    access_token_url = f"{MOCK_BASE}/google/token"
    authorize_url = f"{MOCK_BASE}/google/authorize"
    identity_url = f"{MOCK_BASE}/google/userinfo"
    id_token_issuer = f"{MOCK_BASE}/google"

    # JWKS endpoint of the mock — returns JWK-format keys (not X.509 certs).
    _mock_jwks_url = f"{MOCK_BASE}/google/jwks"

    def _decode_id_token(self, app, id_token):
        """Verify the mock's id_token using JWK-format keys."""
        return jwtkit.verify_and_decode(
            credential=id_token,
            keys_url=self._mock_jwks_url,
            issuer=self.id_token_issuer,
            audience=app.client_id,
            lookup_kid=jwtkit.lookup_kid_jwk,
        )


class MockGitHubOAuth2Adapter(GitHubOAuth2Adapter):
    """GitHub adapter wired to mock-oauth2-server.

    The real GitHub adapter hits github.com token endpoint and github API
    /user + /user/emails. The mock only exposes OIDC-style endpoints.
    We override ``complete_login`` to fetch from mock's userinfo endpoint
    using the Bearer access_token, just like the OIDC flow.

    Requires ``openid`` scope in the authorize request so the mock accepts
    the code exchange (mock-oauth2-server enforces OIDC semantics).
    """

    access_token_url = f"{MOCK_BASE}/github/token"
    authorize_url = f"{MOCK_BASE}/github/authorize"
    _mock_userinfo_url = f"{MOCK_BASE}/github/userinfo"

    def complete_login(self, request, app, token, **kwargs):
        from allauth.socialaccount.adapter import get_adapter
        from allauth.socialaccount.providers.oauth2.client import OAuth2Error

        headers = {"Authorization": f"Bearer {token.token}"}
        with get_adapter().get_requests_session() as sess:
            resp = sess.get(self._mock_userinfo_url, headers=headers)
            if not resp.ok:
                raise OAuth2Error(f"Userinfo request failed: {resp.status_code}")
            extra_data = resp.json()

        # GitHub's provider.extract_uid() reads `data["id"]` (integer) and
        # provider.extract_email_addresses() reads `data.get("email")`.
        # The OIDC userinfo returns `sub` instead — map it so the provider works.
        if "id" not in extra_data and "sub" in extra_data:
            extra_data["id"] = extra_data["sub"]
        # Also add a login field (GitHub profile has it, but mock doesn't).
        if "login" not in extra_data:
            extra_data["login"] = extra_data.get("email", "mock-github-user")

        return self.get_provider().sociallogin_from_response(request, extra_data)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_google_callback_creates_user_and_returns_knox_token(api_client, db, monkeypatch):
    # Patch the adapter_class on the view class so that the serializer uses the mock adapter.
    from apps.users.views import GoogleLogin

    monkeypatch.setattr(GoogleLogin, "adapter_class", MockGoogleOAuth2Adapter)

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


def test_github_callback_creates_user_and_returns_knox_token(api_client, db, monkeypatch):
    # Patch the adapter_class on the view class so that the serializer uses the mock adapter.
    from apps.users.views import GitHubLogin

    monkeypatch.setattr(GitHubLogin, "adapter_class", MockGitHubOAuth2Adapter)

    # Mock requires openid scope; github provider doesn't normally include it.
    # We pass it explicitly for the test's authorize call.
    code = _exchange_at_mock("github", "openid user:email")
    response = api_client.post(
        "/auth/github/",
        {"code": code, "callback_url": "http://localhost:1420/auth/callback"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert "token" in response.data
    assert SocialAccount.objects.filter(provider="github").exists()


def test_oauth_with_existing_email_links_social_account(api_client, verified_user, monkeypatch):
    """User already exists with email matching the provider's claim → social account links to existing user."""
    # Override mock to claim verified_user.email — see mock-oauth2-server docs
    # for per-test claim overrides. Simplest: register a one-off mapping via
    # the debugger endpoint, but the fixed JSON_CONFIG above always returns
    # oauth-test@test.sofi.local; for this test we seed that exact email.
    # Skipping for now — covered by manual run if/when claim overrides land.
    pytest.skip("Per-test claim override requires mock-oauth2-server debugger API")
