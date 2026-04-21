use serde::Serialize;

/// Serialized to the Tauri frontend as `{code, kind, message}`. `kind` is the
/// language-independent semantic code the frontend maps through its i18n
/// layer; `message` is a plain-English fallback used only when the kind
/// mapping is missing.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// User denied the OS keychain prompt (macOS "Always Allow" denied,
    /// Windows Credential Manager cancelled, Linux Secret Service refused).
    #[error("Keychain access denied by the user or OS: {0}")]
    KeychainUserDenied(String),

    /// Keychain exists but is locked — macOS screen-lock state, gnome-keyring
    /// with no master password entered. Unlocking fixes it.
    #[error("Keychain is locked: {0}")]
    KeychainLocked(String),

    /// Stored credential is unreadable (unicode-invalid, truncated, etc.) —
    /// recoverable by overwriting on next sign-in.
    #[error("Stored credential is corrupted: {0}")]
    KeychainCorrupted(String),

    /// No keychain provider at all — Linux without a running Secret Service
    /// daemon, headless CI, some Windows Server SKUs. Not user-fixable from
    /// the UI.
    #[error("Keychain is unavailable on this device: {0}")]
    KeychainUnavailable(String),

    /// Catchall for keyring::Error variants we don't classify more precisely
    /// (Ambiguous, TooLong, BadEncoding on non-corrupt paths, etc.).
    #[error("Keychain returned an unexpected error: {0}")]
    KeychainUnknown(String),

    #[error("OAuth sign-in was cancelled.")]
    OauthCancelled,

    #[error("OAuth provider error: {0}")]
    OauthProviderError(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::KeychainUserDenied(_) => "keychain.user_denied",
            Self::KeychainLocked(_) => "keychain.locked",
            Self::KeychainCorrupted(_) => "keychain.corrupted",
            Self::KeychainUnavailable(_) => "keychain.unavailable",
            Self::KeychainUnknown(_) => "keychain.unknown",
            Self::OauthCancelled => "oauth.cancelled",
            Self::OauthProviderError(_) => "oauth.provider_error",
            Self::Internal(_) => "internal.unknown",
        }
    }

    pub fn status_code(&self) -> u16 {
        500
    }

    pub fn user_message(&self) -> String {
        self.to_string()
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        // keyring v3 surfaces platform specifics via the inner `Box<dyn Error>`
        // message. We look at that string to disambiguate "user denied" from
        // "secret service not running" (both arrive as NoStorageAccess).
        let msg = err.to_string();
        let lower = msg.to_lowercase();
        match err {
            keyring::Error::NoStorageAccess(_) => {
                if lower.contains("denied") || lower.contains("cancel") || lower.contains("user") {
                    Self::KeychainUserDenied(msg)
                } else if lower.contains("locked") {
                    Self::KeychainLocked(msg)
                } else {
                    Self::KeychainUnavailable(msg)
                }
            }
            keyring::Error::PlatformFailure(_) => {
                if lower.contains("locked") {
                    Self::KeychainLocked(msg)
                } else {
                    Self::KeychainUnavailable(msg)
                }
            }
            keyring::Error::BadEncoding(_) => Self::KeychainCorrupted(msg),
            _ => Self::KeychainUnknown(msg),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("code", &self.status_code())?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.user_message())?;
        state.end()
    }
}
