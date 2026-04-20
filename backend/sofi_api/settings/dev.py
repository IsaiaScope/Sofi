"""Development settings — loaded when DJANGO_SETTINGS_MODULE=sofi_api.settings.dev."""

from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Email backend is resolved in base.py: Resend SMTP when RESEND_API_KEY is set,
# otherwise Django's console backend (prints to runserver stdout).
