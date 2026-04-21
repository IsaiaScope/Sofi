"""Logout — POST /auth/logout/ and /auth/logoutall/.

Knox stores tokens hashed server-side. Logout deletes the row so the
plaintext key can't be replayed; logoutall drops every row for the user.
"""

from knox.models import AuthToken


def test_logout_deletes_token_row(authed_client, verified_user):
    assert AuthToken.objects.filter(user=verified_user).count() == 1

    logout = authed_client.post("/auth/logout/")
    assert logout.status_code == 204
    assert AuthToken.objects.filter(user=verified_user).count() == 0


def test_logged_out_token_is_rejected_on_next_request(authed_client):
    authed_client.post("/auth/logout/")
    me = authed_client.get("/auth/user/")
    assert me.status_code == 401


def test_logoutall_invalidates_every_token(authed_client, verified_user):
    # `authed_client` already minted one token; add two more.
    AuthToken.objects.create(verified_user)
    AuthToken.objects.create(verified_user)
    assert AuthToken.objects.filter(user=verified_user).count() == 3

    response = authed_client.post("/auth/logoutall/")
    assert response.status_code == 204
    assert AuthToken.objects.filter(user=verified_user).count() == 0
