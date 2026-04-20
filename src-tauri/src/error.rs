use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Keychain access denied: {0}")]
    KeychainAccessDenied(String),

    #[error("Keychain unavailable: {0}")]
    KeychainUnavailable(String),

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
            Self::KeychainAccessDenied(_) => "keychain.access_denied",
            Self::KeychainUnavailable(_) => "keychain.unavailable",
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
        match err {
            keyring::Error::NoStorageAccess(_) | keyring::Error::PlatformFailure(_) => {
                Self::KeychainAccessDenied(err.to_string())
            }
            _ => Self::KeychainUnavailable(err.to_string()),
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
