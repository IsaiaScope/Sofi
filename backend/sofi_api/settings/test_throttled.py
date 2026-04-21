"""Throttling-on test settings.

Imports from .test (which already disables throttling via REST_FRAMEWORK
overrides) and re-enables short-window throttle rates so throttling tests
trip limits in milliseconds, not minutes.
"""

from .test import *  # noqa: F401,F403
from .test import REST_FRAMEWORK

# Short windows so tests can fire enough requests to trip the limit
# without blowing past the 30s pytest timeout.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/min",
        "user": "10/min",
        # dj-rest-auth's login view uses the `login` scope when present;
        # falls back to anon. Setting it explicitly avoids ambiguity.
        "login": "3/min",
    },
}
