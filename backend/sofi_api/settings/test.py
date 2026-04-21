"""Test settings — loaded by pytest via pyproject.toml's pytest config.

Key differences from dev.py:
- Email backend is ``locmem`` so ``mail.outbox`` is queryable in-process
  (verification + resend flows assert against it).
- Password hasher forced to MD5: every test that creates a user pays the
  default PBKDF2 cost otherwise (~100ms each); this cuts a full suite by
  seconds. Never use MD5 in real envs.
- Throttles disabled so rapid-fire test calls don't trip the rate limiter.
- CORS stays open (tests talk to Django cross-origin from Vite).
"""

from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK

DEBUG = False
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# DRF throttling — off for tests. A single pytest file can fire more
# requests per minute than the anon/user rates allow, which would flake.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

# Keep the allauth confirmation cooldown short so tests can cover the
# resend path without clock-mocking. freezegun handles longer windows.
ACCOUNT_EMAIL_CONFIRMATION_COOLDOWN = 0
