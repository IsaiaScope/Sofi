"""Root pytest fixtures shared by every app's test suite.

- ``api_client`` is an unauthenticated DRF client.
- ``verified_user`` / ``unverified_user`` cover the two states the auth
  flow actually cares about.
- ``authed_client`` returns a DRF client with a Knox token already set.
- ``mailbox`` is ``django.core.mail.outbox`` cleared between tests; the
  email backend is ``locmem`` under test settings.
"""

from collections.abc import Iterator

import pytest
from django.core import mail
from knox.models import AuthToken
from rest_framework.test import APIClient

from apps.users.tests.factories import (
    DEFAULT_TEST_PASSWORD,
    UserFactory,
    VerifiedUserFactory,
)


def pytest_collection_modifyitems(config, items):
    """Auto-mark every test with ``django_db`` — the whole backend suite
    only ever touches the real DB, so opting in per-test is pure noise."""
    for item in items:
        item.add_marker(pytest.mark.django_db)


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def verified_user(db):
    return VerifiedUserFactory()


@pytest.fixture
def unverified_user(db):
    return UserFactory()


@pytest.fixture
def verified_user_with_password(db) -> tuple:
    """Returns (user, raw_password) — for tests that POST to /auth/login/."""
    user = VerifiedUserFactory(password=DEFAULT_TEST_PASSWORD)
    return user, DEFAULT_TEST_PASSWORD


@pytest.fixture
def authed_client(api_client, verified_user) -> APIClient:
    """DRF client pre-authenticated with a freshly minted Knox token."""
    _, token = AuthToken.objects.create(verified_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
    return api_client


@pytest.fixture
def mailbox() -> Iterator[list]:
    mail.outbox = []
    yield mail.outbox
    mail.outbox = []
