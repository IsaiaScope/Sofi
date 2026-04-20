import pytest
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def authed_client(db):
    user = User.objects.create_user(email="u@example.com", password="pw12345678")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
def test_patch_locale_persists(authed_client):
    client, user = authed_client
    response = client.patch("/api/users/settings/", {"locale": "it"}, format="json")
    assert response.status_code == 200
    assert response.data["locale"] == "it"
    user.settings.refresh_from_db()
    assert user.settings.locale == "it"


@pytest.mark.django_db
def test_patch_invalid_locale_rejected(authed_client):
    client, _ = authed_client
    response = client.patch("/api/users/settings/", {"locale": "xx"}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_get_returns_defaults(authed_client):
    client, _ = authed_client
    response = client.get("/api/users/settings/")
    assert response.status_code == 200
    assert response.data["locale"] == "en"
    assert response.data["theme"] == "system"
