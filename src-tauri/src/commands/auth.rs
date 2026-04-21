//! Auth commands — OS keychain storage + OAuth loopback.
//!
//! Django owns user identity. Tauri's only jobs here are:
//!   1. Store/retrieve/delete the Knox bearer token in the OS keychain.
//!   2. Spawn an ephemeral loopback listener for the OAuth authorization-code
//!      redirect; open the system browser; hand the captured `code` back to
//!      the React layer, which POSTs it to Django for token exchange.

use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::oneshot;

use crate::error::AppError;

const KEYCHAIN_SERVICE: &str = "sofi";
const KEYCHAIN_ACCOUNT: &str = "bearer-token";

fn keychain_entry() -> Result<Entry, AppError> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(AppError::from)
}

#[tauri::command]
pub fn auth_store_token(token: String) -> Result<(), AppError> {
    keychain_entry()?.set_password(&token)?;
    Ok(())
}

#[tauri::command]
pub fn auth_get_token() -> Result<Option<String>, AppError> {
    match keychain_entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::from(e)),
    }
}

#[tauri::command]
pub fn auth_clear_token() -> Result<(), AppError> {
    match keychain_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::from(e)),
    }
}

#[derive(Serialize)]
pub struct OauthResult {
    pub code: String,
    pub callback_url: String,
}

#[derive(Deserialize)]
pub struct OauthStartArgs {
    /// Authorization URL built by the frontend, including `client_id`, `scope`,
    /// `state`, `code_challenge`, etc. — everything EXCEPT `redirect_uri`.
    pub partial_auth_url: String,
    /// Random CSRF token that must match the `state` query param of the
    /// provider's redirect. Prevents cross-session code injection.
    pub expected_state: String,
    /// Current UI locale (e.g. "en", "it"). Controls the success page copy.
    /// Defaults to English when absent or unknown.
    #[serde(default)]
    pub locale: Option<String>,
    /// Provider slug — "google" or "github". Included in the success page
    /// subtitle ("Signed in with Google") when present.
    #[serde(default)]
    pub provider: Option<String>,
}

/// Strings shown on the OAuth loopback page, one tuple per supported locale.
/// Covers both the success layout and the error layout (swapped at runtime by
/// an inline script when the provider redirects with `?error=...`, since the
/// plugin serves a single HTML body for every callback).
struct OauthCopy {
    lang_attr: &'static str,
    title: &'static str,
    body: &'static str,
    close_hint: &'static str,
    via_google: &'static str,
    via_github: &'static str,
    /// HUD top-right label ("AUTHORIZED" / "AUTORIZZATO").
    hud_mode: &'static str,
    /// HUD bottom-left status ("session captured" / "sessione acquisita").
    hud_status: &'static str,
    /// HUD bottom-right tag ("Secure" / "Sicuro").
    hud_secure: &'static str,
    /// Error-layout heading (replaces `title`).
    error_title: &'static str,
    /// Error-layout body copy (replaces `body`; rendered red, not muted).
    error_body: &'static str,
    /// HUD top-right label under error ("Denied" / "Negato").
    hud_mode_error: &'static str,
    /// HUD bottom-left status under error ("handshake failed" / "handshake fallito").
    hud_status_error: &'static str,
}

const COPY_EN: OauthCopy = OauthCopy {
    lang_attr: "en",
    title: "Access granted",
    body: "Session captured. Head back to the desktop app — your dashboard is ready.",
    close_hint: "You can safely close this window.",
    via_google: "via Google",
    via_github: "via GitHub",
    hud_mode: "Authorized",
    hud_status: "session captured",
    hud_secure: "Secure",
    error_title: "Sign-in failed",
    error_body: "The provider didn't complete the sign-in. Head back to the desktop app and try again.",
    hud_mode_error: "Denied",
    hud_status_error: "handshake failed",
};

const COPY_IT: OauthCopy = OauthCopy {
    lang_attr: "it",
    title: "Accesso autorizzato",
    body: "Sessione acquisita. Torna all'app desktop — la tua dashboard è pronta.",
    close_hint: "Puoi chiudere questa finestra in tutta sicurezza.",
    via_google: "tramite Google",
    via_github: "tramite GitHub",
    hud_mode: "Autorizzato",
    hud_status: "sessione acquisita",
    hud_secure: "Sicuro",
    error_title: "Accesso fallito",
    error_body: "Il provider non ha completato l'accesso. Torna all'app desktop e riprova.",
    hud_mode_error: "Negato",
    hud_status_error: "handshake fallito",
};

fn pick_copy(locale: Option<&str>) -> &'static OauthCopy {
    match locale.unwrap_or("en") {
        "it" | "it-IT" => &COPY_IT,
        _ => &COPY_EN,
    }
}

/// Build the HTML served by the loopback listener after the provider
/// redirects. The page is a single self-contained document — no external
/// assets besides Google Fonts (needed for the terminal-style typography) —
/// because it lives for the one second between provider-redirect and
/// user-closes-tab, on an ephemeral 127.0.0.1 port that disappears after
/// this request.
///
/// Visual language mirrors `backend/apps/users/templates/users/email_verified.html`
/// and the in-app `verify-success-page.tsx` so the three "auth success"
/// surfaces (browser post-verify, browser post-OAuth, in-app) read as one
/// product.
fn render_oauth_success_html(locale: Option<&str>, provider: Option<&str>) -> String {
    let copy = pick_copy(locale);
    let via_line = match provider {
        Some("google") => format!(r#"<p class="via">{}</p>"#, copy.via_google),
        Some("github") => format!(r#"<p class="via">{}</p>"#, copy.via_github),
        _ => String::new(),
    };
    // Rust's `{:?}` on &str produces a valid JS string literal (double-quoted,
    // with `"`, `\`, and control chars escaped). Our copy is plain text plus
    // a few accented Latin-1 chars, so this is safe to drop into the inline
    // <script> without a JSON dependency.
    let error_title_js = format!("{:?}", copy.error_title);
    let error_body_js = format!("{:?}", copy.error_body);
    let hud_mode_error_js = format!("{:?}", copy.hud_mode_error);
    let hud_status_error_js = format!("{:?}", copy.hud_status_error);

    format!(
        r##"<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<title>{title} — Sofi</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;900&amp;family=JetBrains+Mono:wght@400;700&amp;family=Space+Grotesk:wght@700&amp;display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&amp;display=swap" rel="stylesheet" />
<style>
  :root {{
    --bg: #0f0f1a;
    --surface: #12121e;
    --text: #e2e8f0;
    --text-muted: rgba(255, 255, 255, 0.5);
    --text-dim: rgba(255, 255, 255, 0.3);
    --violet: #7c3aed;
    --violet-hover: #8b5cf6;
    --violet-muted: rgba(124, 58, 237, 0.15);
    --cyan: #06b6d4;
    --cyan-30: rgba(6, 182, 212, 0.3);
    --cyan-20: rgba(6, 182, 212, 0.2);
    --green: #10b981;
    --grid: rgba(6, 182, 212, 0.06);
    --scanline: rgba(0, 0, 0, 0.22);
    --red: #f43f5e;
  }}
  @media (prefers-color-scheme: light) {{
    :root {{
      --bg: #faf9ff;
      --surface: #ffffff;
      --text: #1e1e2e;
      --text-muted: rgba(0, 0, 0, 0.55);
      --text-dim: rgba(0, 0, 0, 0.4);
      --violet: #6b21d8;
      --violet-hover: #7c3aed;
      --violet-muted: rgba(107, 33, 216, 0.12);
      --cyan: #0891b2;
      --cyan-30: rgba(8, 145, 178, 0.3);
      --cyan-20: rgba(8, 145, 178, 0.2);
      --green: #059669;
      --grid: rgba(8, 145, 178, 0.05);
      --scanline: rgba(0, 0, 0, 0.04);
      --red: #dc2626;
    }}
  }}
  /* Error mode: provider redirected back with `?error=...` (cancelled /
     denied / bad request). Inline script below sets `html.error-mode`; these
     overrides flip cyan → amber for brackets+HUD and turn the body copy red.
     Heading stays violet — matches the in-app FaultPage anchor rule. */
  html.error-mode {{
    --cyan: #f59e0b;
    --cyan-30: rgba(245, 158, 11, 0.3);
    --cyan-20: rgba(245, 158, 11, 0.2);
    --green: #f59e0b;
  }}
  @media (prefers-color-scheme: light) {{
    html.error-mode {{
      --cyan: #c2410c;
      --cyan-30: rgba(194, 65, 12, 0.3);
      --cyan-20: rgba(194, 65, 12, 0.2);
      --green: #c2410c;
    }}
  }}
  html.error-mode .body-text {{ color: var(--red); }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; min-height: 100%; }}
  body {{
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    position: relative;
    overflow-x: hidden;
  }}
  body::before, body::after {{
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
  }}
  body::before {{
    background-image:
      linear-gradient(to right, var(--grid) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
    background-size: 32px 32px;
    z-index: 0;
  }}
  body::after {{
    background-image: linear-gradient(to bottom, transparent 50%, var(--scanline) 50%);
    background-size: 100% 4px;
    opacity: 0.3;
    z-index: 1;
  }}

  .hud {{
    position: fixed;
    width: 384px;
    height: 56px;
    padding: 12px;
    display: none;
    align-items: flex-start;
    z-index: 2;
    background-repeat: no-repeat;
    background-size: 100% 2px, 2px 100%;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 16px;
    line-height: 1;
  }}
  @media (min-width: 1200px) {{ .hud {{ display: flex; }} }}
  .hud-tl {{
    top: 48px; left: 48px;
    justify-content: flex-start;
    background-image:
      linear-gradient(to right, var(--violet) 40px, transparent 40px),
      linear-gradient(to bottom, var(--violet) 40px, transparent 40px);
    background-position: top left, top left;
  }}
  .hud-tl .wordmark {{
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.05em;
    color: var(--violet);
  }}
  .hud-tl .material-symbols-outlined {{ color: var(--violet); font-size: 28px; }}
  .hud-tr {{
    top: 48px; right: 48px;
    justify-content: flex-end;
    background-image:
      linear-gradient(to left, var(--cyan) 40px, transparent 40px),
      linear-gradient(to bottom, var(--cyan) 40px, transparent 40px);
    background-position: top right, top right;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }}
  .hud-bl {{
    bottom: 48px; left: 48px;
    align-items: flex-end;
    justify-content: flex-start;
    background-image:
      linear-gradient(to right, var(--cyan) 40px, transparent 40px),
      linear-gradient(to top, var(--cyan) 40px, transparent 40px);
    background-position: bottom left, bottom left;
    color: var(--cyan);
    text-transform: lowercase;
  }}
  .hud-bl .pulse {{ margin-left: 4px; animation: sofi-pulse-dot 1.2s ease-in-out infinite; }}
  .hud-br {{
    bottom: 48px; right: 48px;
    align-items: flex-end;
    justify-content: flex-end;
    background-image:
      linear-gradient(to left, var(--green) 40px, transparent 40px),
      linear-gradient(to top, var(--green) 40px, transparent 40px);
    background-position: bottom right, bottom right;
    color: var(--green);
    letter-spacing: 0.2em;
  }}
  @keyframes sofi-pulse-dot {{
    0%, 100% {{ opacity: 1; }}
    50% {{ opacity: 0.3; }}
  }}
  .hud-row {{ display: inline-flex; align-items: center; gap: 12px; }}

  main {{
    position: relative;
    z-index: 10;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
  }}

  .card-outer {{
    width: 100%;
    max-width: 448px;
    background: var(--cyan-30);
    padding: 1px;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
    box-shadow: 0 0 40px var(--violet-muted);
  }}
  .card-inner {{
    background: var(--surface);
    padding: 32px 24px;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
  }}
  @media (min-width: 640px) {{ .card-inner {{ padding: 40px; }} }}

  .glyph {{
    position: relative;
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-repeat: no-repeat;
    background-image:
      linear-gradient(to right,  var(--cyan) 12px, transparent 12px),
      linear-gradient(to bottom, var(--cyan) 12px, transparent 12px),
      linear-gradient(to left,   var(--cyan) 12px, transparent 12px),
      linear-gradient(to bottom, var(--cyan) 12px, transparent 12px),
      linear-gradient(to right,  var(--cyan) 12px, transparent 12px),
      linear-gradient(to top,    var(--cyan) 12px, transparent 12px),
      linear-gradient(to left,   var(--cyan) 12px, transparent 12px),
      linear-gradient(to top,    var(--cyan) 12px, transparent 12px);
    background-size:
      100% 2px, 2px 100%,
      100% 2px, 2px 100%,
      100% 2px, 2px 100%,
      100% 2px, 2px 100%;
    background-position:
      top left,     top left,
      top right,    top right,
      bottom left,  bottom left,
      bottom right, bottom right;
    animation: sofi-glyph-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }}
  .glyph .material-symbols-outlined {{
    color: var(--cyan);
    font-size: 28px;
    line-height: 1;
  }}
  @keyframes sofi-glyph-pop {{
    from {{ transform: scale(0.6); opacity: 0; }}
    to   {{ transform: scale(1);   opacity: 1; }}
  }}

  h1 {{
    margin: 0 0 6px;
    font-family: "Inter", sans-serif;
    font-size: 28px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--violet);
    text-align: center;
    line-height: 1.15;
  }}
  @media (min-width: 640px) {{ h1 {{ font-size: 32px; }} }}
  .via {{
    margin: 0 0 20px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 16px;
    color: var(--cyan);
    text-align: center;
  }}
  .body-text {{
    margin: 0 0 20px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 16px;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.5;
  }}
  .hint {{
    margin: 20px 0 0;
    padding-top: 16px;
    border-top: 1px solid var(--cyan-20);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 16px;
    color: var(--text-dim);
    text-align: center;
    line-height: 1.5;
  }}
</style>
</head>
<body>
<div class="hud hud-tl" aria-hidden="true">
  <div class="hud-row">
    <span class="material-symbols-outlined">terminal</span>
    <span class="wordmark">SOFI</span>
  </div>
</div>
<div class="hud hud-tr" aria-hidden="true">
  <span>{hud_mode}</span>
</div>
<div class="hud hud-bl" aria-hidden="true">
  <span>&gt; {hud_status}</span><span class="pulse">_</span>
</div>
<div class="hud hud-br" aria-hidden="true">
  <span>// {hud_secure}</span>
</div>
<main>
  <div class="card-outer">
    <div class="card-inner" role="status" aria-live="polite">
      <div class="glyph" aria-hidden="true">
        <span class="material-symbols-outlined">check</span>
      </div>
      <h1>{title}</h1>
      {via_line}
      <p class="body-text">{body}</p>
      <p class="hint">{hint}</p>
    </div>
  </div>
</main>
<script>
  (function () {{
    var params = new URLSearchParams(location.search);
    if (!params.get('error')) return;
    document.documentElement.classList.add('error-mode');
    document.title = {error_title_js} + ' — Sofi';
    var h1 = document.querySelector('h1');
    if (h1) h1.textContent = {error_title_js};
    var bodyEl = document.querySelector('.body-text');
    if (bodyEl) bodyEl.textContent = {error_body_js};
    var via = document.querySelector('.via');
    if (via) via.remove();
    var icon = document.querySelector('.glyph .material-symbols-outlined');
    if (icon) icon.textContent = 'error';
    var modeEl = document.querySelector('.hud-tr span');
    if (modeEl) modeEl.textContent = {hud_mode_error_js};
    var statusEl = document.querySelector('.hud-bl span:first-child');
    if (statusEl) statusEl.textContent = '> ' + {hud_status_error_js};
  }})();
</script>
</body>
</html>"##,
        lang = copy.lang_attr,
        title = copy.title,
        hud_mode = copy.hud_mode,
        hud_status = copy.hud_status,
        hud_secure = copy.hud_secure,
        via_line = via_line,
        body = copy.body,
        hint = copy.close_hint,
        error_title_js = error_title_js,
        error_body_js = error_body_js,
        hud_mode_error_js = hud_mode_error_js,
        hud_status_error_js = hud_status_error_js,
    )
}

#[tauri::command]
pub async fn oauth_start(
    app: AppHandle,
    args: OauthStartArgs,
) -> Result<OauthResult, AppError> {
    let (tx, rx) = oneshot::channel::<String>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    let success_html = render_oauth_success_html(args.locale.as_deref(), args.provider.as_deref());

    let port = tauri_plugin_oauth::start_with_config(
        tauri_plugin_oauth::OauthConfig {
            ports: None,
            response: Some(success_html.into()),
        },
        {
            let tx = Arc::clone(&tx);
            move |url| {
                if let Some(sender) = tx.lock().ok().and_then(|mut g| g.take()) {
                    let _ = sender.send(url);
                }
            }
        },
    )
    .map_err(|e| AppError::OauthProviderError(format!("Failed to start loopback listener: {e}")))?;

    let callback_url = format!("http://127.0.0.1:{port}");
    let separator = if args.partial_auth_url.contains('?') { '&' } else { '?' };
    let full_url = format!(
        "{}{}redirect_uri={}",
        args.partial_auth_url,
        separator,
        url::form_urlencoded::byte_serialize(callback_url.as_bytes()).collect::<String>(),
    );

    app.opener()
        .open_url(&full_url, None::<&str>)
        .map_err(|e| AppError::OauthProviderError(format!("Failed to open browser: {e}")))?;

    // 5-minute cap so a dead listener doesn't leak.
    let redirect = tokio::time::timeout(std::time::Duration::from_secs(300), rx)
        .await
        .map_err(|_| AppError::OauthProviderError("Timeout waiting for OAuth callback".into()))?
        .map_err(|_| AppError::OauthProviderError("OAuth channel closed prematurely".into()))?;

    let parsed = url::Url::parse(&redirect)
        .map_err(|e| AppError::OauthProviderError(format!("Malformed callback URL: {e}")))?;

    let mut code = None;
    let mut received_state = None;
    let mut received_error = None;
    for (k, v) in parsed.query_pairs() {
        match k.as_ref() {
            "code" => code = Some(v.into_owned()),
            "state" => received_state = Some(v.into_owned()),
            "error" => received_error = Some(v.into_owned()),
            _ => {}
        }
    }

    if let Some(err) = received_error {
        // User cancellation isn't a provider fault — it's a normal flow. Map
        // the provider-specific cancel codes to `OauthCancelled` so the UI
        // renders the "Sign-in was cancelled." copy instead of the generic
        // provider-error banner. `access_denied` is the OAuth2 spec value,
        // `user_denied` / `user_cancelled_login` are observed Google+GitHub
        // variants.
        return Err(match err.as_str() {
            "access_denied" | "user_denied" | "user_cancelled_login" => AppError::OauthCancelled,
            _ => AppError::OauthProviderError(format!("Provider error: {err}")),
        });
    }
    if received_state.as_deref() != Some(args.expected_state.as_str()) {
        return Err(AppError::OauthProviderError("State mismatch (possible CSRF)".into()));
    }
    let code = code.ok_or_else(|| AppError::OauthProviderError("No `code` in callback".into()))?;

    Ok(OauthResult { code, callback_url })
}
