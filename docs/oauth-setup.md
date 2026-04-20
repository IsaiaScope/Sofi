# OAuth setup — Google + GitHub, dev + prod

This guide walks you through registering OAuth applications with Google and
GitHub and wiring the credentials into Sofi for two environments: **dev**
(local `pnpm tauri dev`) and **prod** (distributable `pnpm tauri build`).

## How Sofi's OAuth flow works

When the user clicks **Continue with Google** or **Continue with GitHub**:

1. The frontend builds a provider authorization URL (client_id, scope, state)
   and calls the Rust command `oauth_start` (`src-tauri/src/commands/auth.rs`).
2. Rust spins up a loopback HTTP server on an **ephemeral port** via
   `tauri-plugin-oauth` and opens the provider URL in the system browser,
   passing `redirect_uri=http://127.0.0.1:<port>`.
3. After the user consents, the provider redirects back to that loopback URL
   with an authorization `code`.
4. Rust hands the `(code, callback_url)` to the frontend.
5. The frontend POSTs to `/auth/<provider>/` on Django, which exchanges the
   code for an access token server-side (so the client secret never leaves
   the backend).
6. Django mints a Knox session token and returns it to the frontend.

Because the loopback port is ephemeral, the provider apps need to be
registered in a way that accepts arbitrary loopback ports — see the
provider-specific sections below.

---

## Pattern: one OAuth app pair per environment

You will register **four** OAuth apps total:

| Provider | Environment | Purpose |
|----------|-------------|---------|
| Google   | dev         | Used when you run `pnpm tauri dev` locally |
| Google   | prod        | Baked into distributable builds |
| GitHub   | dev         | Used when you run `pnpm tauri dev` locally |
| GitHub   | prod        | Baked into distributable builds |

Keeping dev and prod apps separate means:

- Dev credentials can be liberal (test users, no brand polish) and shared on
  your machine.
- Prod credentials lock down the allowed users / redirect URLs and carry
  verified branding (Google's OAuth consent screen, GitHub's app logo).
- Rotating dev secrets doesn't disturb shipped binaries, and vice versa.

---

## Google — dev OAuth app

1. Open <https://console.cloud.google.com/>.
2. Create a project (or pick an existing one): menu → **IAM & Admin** →
   **Create Project**. Name it `Sofi Dev` or similar.
3. Enable the APIs you need. Menu → **APIs & Services** → **Library**.
   Enable **Google People API** (minimum for `email` + `profile` scopes).
4. Configure the OAuth consent screen. Menu → **APIs & Services** →
   **OAuth consent screen**.
   - User Type: **External** (unless you only need Google Workspace users).
   - Publishing status: stay in **Testing** for dev; add your own Google
     account as a test user. No verification needed while in Testing.
   - Fill out the minimum metadata (app name, support email, developer
     email); no logo required in dev.
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
5. Create the OAuth client. Menu → **APIs & Services** → **Credentials** →
   **Create credentials** → **OAuth client ID**.
   - Application type: **Desktop app** (critical — this is what allows
     loopback redirects on any port without explicit registration).
   - Name: `Sofi Desktop (dev)`.
6. Copy the **Client ID** and **Client secret** from the resulting dialog.
7. Paste into your local `.env`:
   ```
   GOOGLE_CLIENT_ID=<client id>
   GOOGLE_CLIENT_SECRET=<client secret>
   VITE_GOOGLE_CLIENT_ID=<same client id>
   ```

## Google — prod OAuth app

Repeat the steps above with the name `Sofi Desktop (prod)`. Two additional
steps for prod:

- On the OAuth consent screen, move the publishing status from **Testing**
  to **In production**. Google may require a verification review depending
  on which scopes you request — `email` + `profile` + `openid` is in the
  standard set and does not require verification.
- Keep **Desktop app** as the client type. Do NOT switch to Web application;
  Web-app clients require exact redirect URI matching, which breaks the
  ephemeral loopback flow.

Paste the prod client ID into `.env.production`:
```
VITE_GOOGLE_CLIENT_ID=<prod client id>
```
Keep `GOOGLE_CLIENT_SECRET` (the prod one) on whatever platform hosts Django
in prod; do NOT put it in `.env.production` (that file is read by Vite and
bakes contents into the desktop bundle).

---

## GitHub — dev OAuth app

1. Open <https://github.com/settings/developers>.
2. **OAuth Apps** → **New OAuth App**.
3. Application name: `Sofi Dev`.
4. Homepage URL: any URL (`http://localhost:1420` works for dev).
5. **Authorization callback URL**: `http://127.0.0.1` (no port, no path).
   GitHub does loose port matching against loopback, so registering the
   scheme + host is enough for all ephemeral ports.
6. Click **Register application**.
7. On the app page, click **Generate a new client secret**. Copy both
   **Client ID** and **Client secret** immediately — the secret is shown
   once.
8. Paste into `.env`:
   ```
   GITHUB_CLIENT_ID=<client id>
   GITHUB_CLIENT_SECRET=<client secret>
   VITE_GITHUB_CLIENT_ID=<same client id>
   ```

## GitHub — prod OAuth app

Repeat with:

- Name: `Sofi`.
- Homepage URL: your real product URL (or a placeholder like
  `https://sofi.app` if there is no site yet).
- Authorization callback URL: still `http://127.0.0.1` (the loopback
  scheme is what the desktop app uses — it does not change between dev
  and prod).
- Consider uploading the app icon and filling in a description so the
  consent screen looks branded.

Paste the prod client ID into `.env.production`:
```
VITE_GITHUB_CLIENT_ID=<prod client id>
```
Prod `GITHUB_CLIENT_SECRET` lives in the backend hosting platform's secret
store.

---

## Environment file cheat sheet

| File                     | Committed? | Purpose                                      |
|--------------------------|-----------|----------------------------------------------|
| `.env.example`           | yes       | Template for local dev — copy to `.env`       |
| `.env.production.example`| yes       | Template for prod Tauri builds — copy to `.env.production` |
| `.env`                   | no        | Your local dev values (dev OAuth creds, dev secret key, etc.) |
| `.env.production`        | no        | Frontend prod values (VITE_* only) for `pnpm tauri build` |

**The backend client secret is never in a committed or bundle-embedded
file.** In dev it sits in `.env` next to the IDs (fine — that file is
gitignored and never shipped). In prod it lives only on whatever platform
hosts Django (Fly, Render, Railway, a VM, etc.).

---

## Testing the setup

1. Fill in all four `.env` values for dev.
2. `docker compose up -d postgres adminer`
3. `pnpm tauri dev`
4. On the login screen, click **Continue with Google**. A system browser
   should open the Google consent screen with the app name you chose.
5. Consent. The browser window should show the "Signed in to Sofi. You can
   close this window." message; the desktop app should redirect to the
   main app view.
6. Repeat with **Continue with GitHub**.

If the consent screen doesn't open, check the Django runserver output for
the `/auth/google/` or `/auth/github/` request — the most common failure is
a client ID that doesn't match between `GOOGLE_CLIENT_ID` (backend) and
`VITE_GOOGLE_CLIENT_ID` (frontend). Both must be identical.

---

## Gotchas

- **Vite does not do variable expansion.** You cannot write
  `VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}` and expect it to work — paste
  the literal ID twice, or use a tool like `direnv` / `dotenvx` if you want
  to avoid duplication.
- **Client IDs are public; client secrets are not.** Baking the client ID
  into the desktop bundle via `VITE_*` is fine. Baking the secret would be
  a disclosure bug — don't do it, and there is no `VITE_*_SECRET` variable
  for that reason.
- **Google "Web application" client type does not work** with the ephemeral
  loopback flow. It requires exact redirect-URI matching. Stay on **Desktop
  app**.
- **GitHub requires a registered callback URL.** `http://127.0.0.1` is the
  canonical loopback registration; with no port, GitHub matches any port on
  `127.0.0.1`.
- **Prod Google consent screen may require verification** if you add
  sensitive scopes (anything beyond `email` + `profile` + `openid`). Stick
  to the standard set unless you have a reason.
- **The `DEFAULT_FROM_EMAIL` address** in `.env` appears in the verification
  emails sent for email/password sign-ups. Use a real address for prod.
- **Dev email backend is console-only.** `settings/dev.py` sets
  `EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"`, which
  prints email bodies to the Django runserver stdout. No real SMTP is
  touched in dev.
