"""Round-trip tests: Accept-Language header drives response translation."""

import pytest
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.mark.django_db
def test_register_dup_email_italian():
    User.objects.create_user(email="dup@example.com", password="pw12345678")

    client = APIClient()
    response = client.post(
        "/auth/registration/",
        {
            "email": "dup@example.com",
            "password1": "another1234",
            "password2": "another1234",
        },
        format="json",
        HTTP_ACCEPT_LANGUAGE="it",
    )
    assert response.status_code == 400
    body = response.json()
    # Django returns serializer errors like {"email": ["..."]}.
    body_str = str(body)
    assert "registrato" in body_str or "Un utente" in body_str, body_str


@pytest.mark.django_db
def test_register_dup_email_english():
    User.objects.create_user(email="dup2@example.com", password="pw12345678")

    client = APIClient()
    response = client.post(
        "/auth/registration/",
        {
            "email": "dup2@example.com",
            "password1": "another1234",
            "password2": "another1234",
        },
        format="json",
        HTTP_ACCEPT_LANGUAGE="en",
    )
    assert response.status_code == 400
    body_str = str(response.json())
    assert "already registered" in body_str, body_str
