"""DRF throttle limits on auth endpoints.

These tests REQUIRE settings.test_throttled — running under settings.test
will silently pass because throttling is disabled. Pytest's strict-markers
plus the run command `pytest -m throttling --ds=sofi_api.settings.test_throttled`
makes the dependency explicit.

The module-level ``skipif`` skips the entire file when the wrong settings
module is active, preventing false-passes under settings.test.
"""

import os

import pytest

from apps.users.tests.factories import TEST_EMAIL_SUFFIX

pytestmark = [
    pytest.mark.throttling,
    pytest.mark.skipif(
        "sofi_api.settings.test_throttled" not in os.environ.get("DJANGO_SETTINGS_MODULE", ""),
        reason="Throttling tests require settings.test_throttled",
    ),
]


def test_anon_login_trips_throttle_after_n_requests(api_client, verified_user_with_password):
    user, password = verified_user_with_password

    # First few requests succeed; subsequent ones are 429.
    # We clear cookies after every call so the client stays anonymous for the
    # next request — SessionAuthentication would otherwise authenticate the
    # session created on the first login, switching the throttle from
    # AnonRateThrottle (5/min) to UserRateThrottle (10/min) and requiring
    # more iterations than this test fires.
    successes = 0
    throttled = 0
    for _ in range(10):
        response = api_client.post(
            "/auth/login/",
            {"email": user.email, "password": password},
            format="json",
        )
        # Clear session cookie so each request is seen as anonymous.
        api_client.cookies.clear()
        if response.status_code == 200:
            successes += 1
        elif response.status_code == 429:
            throttled += 1

    assert throttled > 0, "Expected at least one 429 response"
    assert successes >= 1, "First request should not be throttled"


def test_throttle_429_includes_retry_after_header(api_client):
    # Burn through the anon limit with a junk endpoint hit.
    last = None
    for _ in range(15):
        last = api_client.post(
            "/auth/login/",
            {"email": f"throttle-test{TEST_EMAIL_SUFFIX}", "password": "x"},
            format="json",
        )
        if last.status_code == 429:
            break

    assert last.status_code == 429
    # DRF sets Retry-After when wait time is computed.
    assert "Retry-After" in last.headers
