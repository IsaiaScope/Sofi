"""Social (OAuth) endpoints.

Desktop clients send one of:
  {"access_token": "..."}                         # PKCE-exchanged by the client
  {"code": "...", "callback_url": "http://..."}   # server exchanges via client_secret

Both return a freshly-minted Knox token (see KnoxIssueMixin).
"""

from django.urls import path

from .views import GitHubLogin, GoogleLogin

urlpatterns = [
    path("google/", GoogleLogin.as_view(), name="google_login"),
    path("github/", GitHubLogin.as_view(), name="github_login"),
]
