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
        Err(e) => Err(AppError::Keychain(e.to_string())),
    }
}

#[tauri::command]
pub fn auth_clear_token() -> Result<(), AppError> {
    match keychain_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Keychain(e.to_string())),
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
}

#[tauri::command]
pub async fn oauth_start(
    app: AppHandle,
    args: OauthStartArgs,
) -> Result<OauthResult, AppError> {
    let (tx, rx) = oneshot::channel::<String>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    let port = tauri_plugin_oauth::start_with_config(
        tauri_plugin_oauth::OauthConfig {
            ports: None,
            response: Some(
                "<html><body><h2>Signed in to Sofi.</h2>\
                <p>You can close this window.</p></body></html>"
                    .into(),
            ),
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
    .map_err(|e| AppError::Oauth(format!("Failed to start loopback listener: {e}")))?;

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
        .map_err(|e| AppError::Oauth(format!("Failed to open browser: {e}")))?;

    // 5-minute cap so a dead listener doesn't leak.
    let redirect = tokio::time::timeout(std::time::Duration::from_secs(300), rx)
        .await
        .map_err(|_| AppError::Oauth("Timeout waiting for OAuth callback".into()))?
        .map_err(|_| AppError::Oauth("OAuth channel closed prematurely".into()))?;

    let parsed = url::Url::parse(&redirect)
        .map_err(|e| AppError::Oauth(format!("Malformed callback URL: {e}")))?;

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
        return Err(AppError::Oauth(format!("Provider error: {err}")));
    }
    if received_state.as_deref() != Some(args.expected_state.as_str()) {
        return Err(AppError::Oauth("State mismatch (possible CSRF)".into()));
    }
    let code = code.ok_or_else(|| AppError::Oauth("No `code` in callback".into()))?;

    Ok(OauthResult { code, callback_url })
}
