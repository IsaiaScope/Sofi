use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Keychain error: {0}")]
    Keychain(String),

    #[error("OAuth error: {0}")]
    Oauth(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn status_code(&self) -> u16 {
        500
    }

    pub fn user_message(&self) -> String {
        let (Self::Keychain(msg) | Self::Oauth(msg) | Self::Internal(msg)) = self;
        msg.clone()
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        Self::Keychain(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", &self.status_code())?;
        state.serialize_field("message", &self.user_message())?;
        state.end()
    }
}
