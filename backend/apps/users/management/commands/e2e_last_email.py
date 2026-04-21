"""Pull verification or password-reset URLs out of the locmem mailbox
or the file-based e2e mail directory.

Two email-reading strategies:

1. **locmem** (pytest / unit tests): Django's test runner populates
   ``mail.outbox`` in-process. The command reads directly from it.

2. **filebased** (Playwright e2e): the Django server process writes each
   outbound email as a ``.eml``-style file to ``settings.EMAIL_FILE_PATH``
   (defaults to ``/tmp/sofi-e2e-mail``). This command scans those files
   from the test-fixture process — cross-process reading works because
   both processes share the filesystem.

The command auto-detects which strategy to use based on
``settings.EMAIL_BACKEND``.

Refuses to run outside dev/test settings — locmem only works there anyway,
but the explicit guard matches the other ``e2e_*`` commands.
"""

import json
import os
import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings

VERIFY_RE = re.compile(r"https?://[\w.:-]+(/accounts/confirm-email/(?P<key>[\w:.-]+)/?)")
RESET_RE = re.compile(
    r"https?://[\w.:-]+(/password-reset/(?P<uid>[\w-]+)/(?P<token>[\w-]+)/?)"
)

_LOCMEM_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
_FILEBASED_BACKEND = "django.core.mail.backends.filebased.EmailBackend"


def _messages_from_locmem(addr: str) -> list[str]:
    """Return email bodies addressed to ``addr`` from in-memory outbox."""
    from django.core import mail

    if not hasattr(mail, "outbox"):
        raise CommandError(
            "mail.outbox is not available. "
            "The locmem backend is only accessible in-process (same Django "
            "instance that sent the email). For Playwright e2e tests use "
            "sofi_api.settings.e2e which configures the filebased backend."
        )
    return [m.body for m in mail.outbox if any(t.lower() == addr for t in m.to)]


def _messages_from_filebased(addr: str) -> list[str]:
    """Return email bodies addressed to ``addr`` from the e2e mail directory.

    Django's filebased backend writes RFC 2822 bytes to ``.log`` files under
    ``settings.EMAIL_FILE_PATH``. Multiple emails may be concatenated in a
    single file (separated by ``b'-' * 79``). We parse each file with the
    stdlib ``email`` module to extract To: and decoded text/plain payloads.
    """
    import email as emaillib

    mail_dir = getattr(settings, "EMAIL_FILE_PATH", "/tmp/sofi-e2e-mail")
    if not os.path.isdir(mail_dir):
        raise CommandError(
            f"E2E mail directory {mail_dir!r} does not exist. "
            "Has the Django server sent any emails yet?"
        )

    bodies: list[str] = []
    for filename in sorted(os.listdir(mail_dir)):
        filepath = os.path.join(mail_dir, filename)
        try:
            raw = open(filepath, "rb").read()
        except OSError:
            continue

        # Each email is terminated by a line of 79 dashes. Split on that.
        separator = b"-" * 79
        chunks = raw.split(separator)

        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            try:
                msg = emaillib.message_from_bytes(chunk)
            except Exception:
                continue

            to_header = msg.get("To", "")
            if addr.lower() not in to_header.lower():
                continue

            # Extract text/plain payload (plain-text body).
            body_text = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body_text = part.get_payload(decode=True).decode("utf-8", errors="replace")
                        break
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    body_text = payload.decode("utf-8", errors="replace")
                else:
                    body_text = str(msg.get_payload())

            if body_text:
                bodies.append(body_text)

    return bodies


class Command(BaseCommand):
    help = "Print the URL/key from the latest verification or reset email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--kind", choices=("verify", "reset"), required=True)

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_last_email")

        addr = opts["email"].strip().lower()
        kind = opts["kind"]

        backend = settings.EMAIL_BACKEND
        if backend == _FILEBASED_BACKEND:
            bodies = _messages_from_filebased(addr)
        else:
            # Default: locmem (pytest) or any custom backend — fall back to
            # in-process outbox.
            bodies = _messages_from_locmem(addr)

        if not bodies:
            raise CommandError(f"No email in outbox for {addr}.")

        body = bodies[-1]
        if kind == "verify":
            match = VERIFY_RE.search(body)
            if not match:
                raise CommandError(f"No verification URL in latest email to {addr}.")
            payload = {"kind": "verify", "url": match.group(0), "key": match.group("key")}
        else:
            match = RESET_RE.search(body)
            if not match:
                raise CommandError(f"No password-reset URL in latest email to {addr}.")
            payload = {
                "kind": "reset",
                "url": match.group(0),
                "uid": match.group("uid"),
                "token": match.group("token"),
            }

        self.stdout.write(json.dumps(payload) + "\n")
