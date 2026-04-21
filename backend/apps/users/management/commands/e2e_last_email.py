"""Pull verification or password-reset URLs out of the locmem mailbox.

Refuses to run outside dev/test settings — locmem only works there anyway,
but the explicit guard matches the other ``e2e_*`` commands.
"""

import json
import re

from django.core import mail
from django.core.management.base import BaseCommand, CommandError

from apps.users.management.commands._e2e_utils import assert_test_or_dev_settings

VERIFY_RE = re.compile(r"https?://[\w.:-]+(/accounts/confirm-email/(?P<key>[\w:.-]+)/?)")
RESET_RE = re.compile(
    r"https?://[\w.:-]+(/password-reset/(?P<uid>[\w-]+)/(?P<token>[\w-]+)/?)"
)


class Command(BaseCommand):
    help = "Print the URL/key from the latest verification or reset email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--kind", choices=("verify", "reset"), required=True)

    def handle(self, *_args, **opts):
        assert_test_or_dev_settings("e2e_last_email")

        addr = opts["email"].strip().lower()
        kind = opts["kind"]

        matching = [m for m in mail.outbox if any(t.lower() == addr for t in m.to)]
        if not matching:
            raise CommandError(f"No email in outbox for {addr}.")

        body = matching[-1].body
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
