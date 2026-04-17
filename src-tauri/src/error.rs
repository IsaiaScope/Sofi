use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Authentication failed: {0}")]
    Auth(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn status_code(&self) -> u16 {
        match self {
            Self::Validation(_) => 400,
            Self::Auth(_) => 401,
            Self::NotFound(_) => 404,
            Self::Database(_) | Self::Internal(_) => 500,
        }
    }

    pub fn user_message(&self) -> String {
        match self {
            Self::Database(e) => format!("A database error occurred: {e}"),
            Self::Auth(msg) | Self::NotFound(msg) | Self::Validation(msg) | Self::Internal(msg) => {
                msg.clone()
            }
        }
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
