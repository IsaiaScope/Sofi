"""Custom DRF exception handler.

Reshapes every API error into a single stable envelope so the Tauri client can
branch on semantic codes instead of parsing English prose:

    {
      "code":         "<semantic code>",
      "detail":       "<human-readable fallback, Accept-Language-aware>",
      "field_errors": {"email": ["validation.email_invalid"], ...},
      "retry_after":  <seconds, 429 only>
    }

Classification priority, per field:
    1. `(field, drf_code)` lookup — language-independent (DRF attaches a stable
       `.code` to each ErrorDetail regardless of whether gettext translated it).
    2. Field-name heuristics for unclassified codes (e.g. uid/token always mean
       an invalid reset link).
    3. Minimal English-message fallback for allauth messages that don't set a
       DRF code — intentionally NOT exhaustive, since anything missed here
       degrades gracefully to the translated `detail` field in the UI.

Views that need to emit a bespoke `{code, detail}` shape without going through
DRF's exception system (e.g. KnoxLoginView's `auth.email_not_verified` branch)
return a Response directly — those never reach this handler.
"""

from __future__ import annotations

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler as drf_exception_handler

_GENERIC_FALLBACK = "validation.invalid"

# (field, drf_code) → semantic code. Field-first because e.g. `"unique"` on
# `email` is a different UX case than `"unique"` on some future `username`.
# Entry for `""` field matches any field — used for codes whose meaning doesn't
# depend on the field name (e.g. `"throttled"`, `"authentication_failed"`).
_CODE_TABLE: dict[tuple[str, str], str] = {
    ("", "authentication_failed"): "auth.invalid_credentials",
    ("", "not_authenticated"): "auth.not_authenticated",
    ("", "permission_denied"): "auth.permission_denied",
    ("", "throttled"): "rate_limited",

    ("email", "unique"): "auth.email_already_registered",
    ("email", "invalid"): "validation.email_invalid",
    ("email", "required"): "validation.required",
    ("email", "blank"): "validation.required",

    ("password", "required"): "validation.required",
    ("password", "blank"): "validation.required",
    ("password1", "required"): "validation.required",
    ("password1", "blank"): "validation.required",
    ("password2", "required"): "validation.required",
    ("password2", "blank"): "validation.required",
    ("new_password1", "required"): "validation.required",
    ("new_password2", "required"): "validation.required",

    ("token", "invalid"): "password_reset.invalid_token",
    ("uid", "invalid"): "password_reset.invalid_token",

    # Login serializer: allauth reports invalid credentials via non_field_errors
    # with a bare "invalid" code. Disambiguated by the presence of the `email`
    # field in the request — see `_classify_non_field_error`.
    ("non_field_errors", "invalid"): "auth.invalid_credentials",
}

# Fallback per field when the drf code isn't in the table. Keeps us from
# emitting raw codes like `password1.min_length` to the client.
_FIELD_DEFAULT: dict[str, str] = {
    "email": "validation.email_invalid",
    "password": "validation.password_invalid",
    "password1": "validation.password_invalid",
    "password2": "validation.password_invalid",
    "new_password1": "validation.password_invalid",
    "new_password2": "validation.password_invalid",
    "token": "password_reset.invalid_token",
    "uid": "password_reset.invalid_token",
}


def _classify(field: str, error_detail) -> str:
    """Map a single DRF ErrorDetail to a semantic code."""
    drf_code = getattr(error_detail, "code", None) or "invalid"

    # UUID validation errors from dj-rest-auth's PasswordResetConfirmSerializer
    # come through non_field_errors with code="invalid" but their message contains
    # "UUID". Check this before the code table so they don't hit auth.invalid_credentials.
    if "UUID" in str(error_detail):
        return "password_reset.invalid_token"

    if (field, drf_code) in _CODE_TABLE:
        return _CODE_TABLE[(field, drf_code)]
    if ("", drf_code) in _CODE_TABLE:
        return _CODE_TABLE[("", drf_code)]

    # Password validator codes from Django's auth.password_validation —
    # they surface on password1/password2/new_password1/new_password2.
    if field.startswith(("password", "new_password")):
        if drf_code in ("password_too_short", "min_length"):
            return "validation.password_too_short"
        if drf_code == "password_too_common":
            return "validation.password_too_common"
        if drf_code == "password_entirely_numeric":
            return "validation.password_numeric"
        if drf_code == "password_too_similar":
            return "validation.password_too_similar"
        if drf_code == "password_mismatch":
            return "validation.password_mismatch"

    # Last-resort heuristic for allauth's "is not a valid UUID." which comes
    # through non_field_errors with the default "invalid" code. Field-agnostic
    # because dj-rest-auth's PasswordResetConfirmSerializer raises it bare.
    if "UUID" in str(error_detail):
        return "password_reset.invalid_token"

    return _FIELD_DEFAULT.get(field, _GENERIC_FALLBACK)


def _walk_errors(data) -> tuple[dict[str, list[str]], list[str], str]:
    """Split a DRF error payload into (field_errors, top_level_codes, detail).

    `detail` is the first human-readable message encountered — already
    translated by Django's LocaleMiddleware if Accept-Language was set.
    """
    field_errors: dict[str, list[str]] = {}
    top_level_codes: list[str] = []
    first_message = ""

    if isinstance(data, dict):
        for key, value in data.items():
            if key == "detail":
                if not first_message:
                    first_message = str(value)
                continue
            if not isinstance(value, list):
                value = [value]
            codes = [_classify(key, item) for item in value]
            messages = [str(item) for item in value]
            if not first_message and messages:
                first_message = messages[0]
            if key == "non_field_errors":
                top_level_codes.extend(codes)
            else:
                field_errors[key] = codes
    elif isinstance(data, list):
        for item in data:
            code = _classify("", item)
            top_level_codes.append(code)
            if not first_message:
                first_message = str(item)

    return field_errors, top_level_codes, first_message


def custom_exception_handler(exc, context):
    """DRF-compatible handler that reshapes every error into the Sofi envelope."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return response

    # Already in Sofi envelope shape (view returned `{code, detail}` directly).
    if isinstance(response.data, dict) and "code" in response.data:
        return response

    field_errors, top_level_codes, detail = _walk_errors(response.data)

    if isinstance(exc, Throttled):
        top_level_codes = top_level_codes or ["rate_limited"]
        retry_after = int(exc.wait) if exc.wait else None
    else:
        retry_after = None

    if top_level_codes:
        code = top_level_codes[0]
    elif field_errors:
        code = next(iter(field_errors.values()))[0]
    else:
        code = "internal.unknown"

    # Token/UID validation errors arrive via non_field_errors (dj-rest-auth raises
    # them without a field name), but they conceptually belong to the `token`
    # field in the password-reset-confirm form. Promote them so the envelope
    # always carries `field_errors` and the frontend can highlight the right field.
    if code == "password_reset.invalid_token" and not field_errors:
        field_errors = {"token": ["password_reset.invalid_token"]}

    payload: dict = {"code": code, "detail": detail or ""}
    if field_errors:
        payload["field_errors"] = field_errors
    if retry_after is not None:
        payload["retry_after"] = retry_after
    response.data = payload
    return response
