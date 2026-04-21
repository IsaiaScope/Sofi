"""Custom allauth account adapter.

Overrides allauth's enumeration-prevention emails. Those are unstyled plain-text
defaults that fire when:

  - signup attempt uses an already-registered email → `account_already_exists`
  - password-reset request targets an unregistered email → `unknown_account`

Our UI already surfaces "email already registered" directly in the signup form
(the serializer raises `auth.email_already_registered` with a 400), so the
extra "someone tried to sign up as you" email adds no defensive value — an
attacker already learns the account exists from the HTTP response. The
`unknown_account` email is silenced via `ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS = False`
in settings (which this adapter doesn't need to handle directly).

Everything else (confirmation, password reset key) flows through our custom
HTML templates and is left untouched.
"""

from allauth.account.adapter import DefaultAccountAdapter


class SofiAccountAdapter(DefaultAccountAdapter):
    def send_account_already_exists_mail(self, email: str) -> None:
        return None
