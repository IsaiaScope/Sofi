"""Base settings shared by dev and prod."""

from datetime import timedelta
from pathlib import Path

import environ
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR.parent / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-only-replace-in-prod")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Local apps first — so their templates/ dirs win over third-party defaults
    # (e.g. allauth ships account/email/email_confirmation_message.txt that we
    # override in apps/users/templates/).
    "apps.users",
    "apps.boards",
    "apps.tasks",
    "apps.attachments",
    # auth stack
    "rest_framework",
    "rest_framework.authtoken",
    "knox",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "sofi_api.urls"
WSGI_APPLICATION = "sofi_api.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {"default": env.db("DATABASE_URL", default="postgres://sofi:sofi@localhost:5432/sofi")}

AUTH_USER_MODEL = "users.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en"
LANGUAGES = [
    ("en", _("English")),
    ("it", _("Italian")),
]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SITE_ID = 1

# allauth — email as identifier, no username.
# Both the new-style (LOGIN_METHODS / SIGNUP_FIELDS) and legacy settings must be
# set: legacy ones are still read by allauth.utils.get_username_max_length, which
# runs at import time inside dj-rest-auth's RegisterSerializer.
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
# Required by allauth.utils.get_username_max_length (called at import time by
# dj-rest-auth's RegisterSerializer) — our User has no username field.
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_USER_MODEL_EMAIL_FIELD = "email"
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
# Custom adapter silences allauth's `account_already_exists` email. The signup
# serializer already returns a coded 400 for duplicates — the extra email was
# both unstyled and redundant.
ACCOUNT_ADAPTER = "apps.users.adapter.SofiAccountAdapter"
# Silences the `unknown_account` email that allauth would send during a
# password-reset request with an unregistered email. The password-reset
# endpoint still returns 2xx either way (enumeration opacity stays intact via
# `ACCOUNT_PREVENT_ENUMERATION` default) — we just don't send mail that would
# otherwise land in a stranger's inbox from an unverified sender.
ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS = False
ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL = "/email-verified/"
ACCOUNT_EMAIL_CONFIRMATION_AUTHENTICATED_REDIRECT_URL = "/email-verified/"
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_EMAIL_SUBJECT_PREFIX = ""
SOCIALACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_AUTO_SIGNUP = True

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Sofi <no-reply@sofi.local>")

# Email delivery. Default is the console backend (prints emails to the Django
# runserver stdout) — safe for offline dev and overridden by the per-env module.
# If RESEND_API_KEY is set, we switch to Resend's SMTP for real delivery.
# Resend is used both in dev (if you want real emails) and prod. Signup + API
# key: https://resend.com → Settings → API Keys.
RESEND_API_KEY = env("RESEND_API_KEY", default="")
if RESEND_API_KEY:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.resend.com"
    EMAIL_PORT = 587
    EMAIL_HOST_USER = "resend"
    EMAIL_HOST_PASSWORD = RESEND_API_KEY
    EMAIL_USE_TLS = True
else:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND",
        default="django.core.mail.backends.console.EmailBackend",
    )

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "offline"},
        "OAUTH_PKCE_ENABLED": True,
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID", default=""),
            "secret": env("GOOGLE_CLIENT_SECRET", default=""),
            "key": "",
        },
    },
    "github": {
        "SCOPE": ["user:email"],
        "APP": {
            "client_id": env("GITHUB_CLIENT_ID", default=""),
            "secret": env("GITHUB_CLIENT_SECRET", default=""),
            "key": "",
        },
    },
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "knox.auth.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"user": "1000/hour", "anon": "30/hour"},
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # Reshapes every error into {code, detail, field_errors?, retry_after?}.
    "EXCEPTION_HANDLER": "apps.users.exception_handler.custom_exception_handler",
}

REST_AUTH = {
    "USE_JWT": False,
    "USER_DETAILS_SERIALIZER": "apps.users.serializers.UserSerializer",
    "REGISTER_SERIALIZER": "apps.users.serializers.RegisterSerializer",
    # Knox tokens are minted directly in apps/users/views.py. Setting TOKEN_MODEL
    # to None suppresses the DRF authtoken row that LoginView.login() would
    # otherwise create as a side effect on every sign-in / social login.
    "TOKEN_MODEL": None,
}

REST_KNOX = {
    "TOKEN_TTL": timedelta(days=30),
    # AUTO_REFRESH disabled: a desktop IDE makes many requests per session and
    # each refresh is a Postgres UPDATE. 30-day fixed expiry is the right trade.
    "AUTO_REFRESH": False,
    "TOKEN_LIMIT_PER_USER": 10,
    "USER_SERIALIZER": "apps.users.serializers.UserSerializer",
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:1420", "http://127.0.0.1:1420", "tauri://localhost"],
)
CORS_ALLOW_CREDENTIALS = True
