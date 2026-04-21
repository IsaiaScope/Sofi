"""Top-level URL routing for sofi_api.

Auth endpoints under /auth/; future domain endpoints under /api/v1/.
"""

from dj_rest_auth.registration.views import ResendEmailVerificationView
from dj_rest_auth.views import (
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetView,
    UserDetailsView,
)
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from knox import views as knox_views

from apps.users.views import DeleteAccountView, KnoxLoginView, KnoxRegisterView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Email + password (Knox-backed)
    path("auth/login/", KnoxLoginView.as_view(), name="rest_login"),
    path("auth/logout/", knox_views.LogoutView.as_view(), name="rest_logout"),
    path("auth/logoutall/", knox_views.LogoutAllView.as_view(), name="knox_logoutall"),
    path("auth/registration/", KnoxRegisterView.as_view(), name="rest_register"),
    path(
        "auth/registration/resend-email/",
        ResendEmailVerificationView.as_view(),
        name="rest_resend_email",
    ),
    path("auth/user/", UserDetailsView.as_view(), name="rest_user_details"),
    path("auth/account/", DeleteAccountView.as_view(), name="account_delete"),
    path("auth/password/reset/", PasswordResetView.as_view(), name="rest_password_reset"),
    path(
        "auth/password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="rest_password_reset_confirm",
    ),
    path("auth/password/change/", PasswordChangeView.as_view(), name="rest_password_change"),

    path("auth/", include("apps.users.urls_social")),
    path("auth/tokens/", include("apps.users.urls_tokens")),

    # allauth — gives us /accounts/confirm-email/<key>/ used in verification emails.
    path("accounts/", include("allauth.urls")),
    # Post-verification landing page. Shows "Return to Sofi" button linking to
    # the sofi:// deep-link scheme.
    path(
        "email-verified/",
        TemplateView.as_view(template_name="users/email_verified.html"),
        name="email_verified",
    ),
    # Password-reset landing page. Email clients strip/ignore sofi:// links, so
    # reset emails have to carry a real https:// URL; this view renders a
    # branded "Open Sofi" page that fires the sofi://recover/confirm deep link.
    # The URL name `password_reset_confirm` is also what dj-rest-auth's default
    # `url_generator` reverses when building the link in the email body.
    path(
        "password-reset/<str:uidb64>/<str:token>/",
        TemplateView.as_view(template_name="users/password_reset_landing.html"),
        name="password_reset_confirm",
    ),

    path("api/users/", include("apps.users.urls")),
    path("api/v1/", include("apps.boards.urls")),
    path("api/v1/", include("apps.tasks.urls")),
    path("api/v1/", include("apps.attachments.urls")),
]
