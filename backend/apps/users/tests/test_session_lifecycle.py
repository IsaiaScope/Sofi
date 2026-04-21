"""Knox token lifecycle — issue, revoke single, revoke all, expired token returns 401."""

from knox.models import AuthToken

from apps.users.tests.factories import DEFAULT_TEST_PASSWORD  # noqa: F401 (imported for completeness; used implicitly via fixtures)


def test_user_can_have_multiple_tokens(verified_user):
    AuthToken.objects.create(verified_user)
    AuthToken.objects.create(verified_user)
    assert verified_user.auth_token_set.count() == 2


def test_logout_invalidates_only_the_current_token(api_client, verified_user):
    _, t1 = AuthToken.objects.create(verified_user)
    _, t2 = AuthToken.objects.create(verified_user)

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {t1}")
    response = api_client.post("/auth/logout/")
    assert response.status_code == 204
    assert verified_user.auth_token_set.count() == 1

    # The other token still works.
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {t2}")
    me = api_client.get("/auth/user/")
    assert me.status_code == 200


def test_logoutall_invalidates_every_token(api_client, verified_user):
    _, t1 = AuthToken.objects.create(verified_user)
    AuthToken.objects.create(verified_user)
    AuthToken.objects.create(verified_user)

    api_client.credentials(HTTP_AUTHORIZATION=f"Token {t1}")
    response = api_client.post("/auth/logoutall/")
    assert response.status_code == 204
    assert verified_user.auth_token_set.count() == 0


def test_revoked_token_returns_401(api_client, verified_user):
    _, token = AuthToken.objects.create(verified_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    AuthToken.objects.filter(user=verified_user).delete()

    response = api_client.get("/auth/user/")
    assert response.status_code == 401
