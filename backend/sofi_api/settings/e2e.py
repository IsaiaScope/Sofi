"""E2E settings — used by the Django webserver spawned by Playwright.

Differs from test.py in one key way: email uses the file-based backend
(writing to /tmp/sofi-e2e-mail/) so the e2e_last_email management
command (which runs in a separate OS process) can read emails that were
sent by the server process.

pytest unit tests still use test.py (locmem backend) — they read from
mail.outbox in-process and don't need cross-process email reading.
"""

from .test import *  # noqa: F401,F403

import os

# File-based email backend: each email becomes a .eml file in this dir.
# The e2e_last_email management command reads from the same path.
EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
E2E_MAIL_DIR = os.environ.get("E2E_MAIL_DIR", "/tmp/sofi-e2e-mail")
EMAIL_FILE_PATH = E2E_MAIL_DIR
