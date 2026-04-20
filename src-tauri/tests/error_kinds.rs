use sofi_lib::error::AppError;
use serde_json::Value;

#[test]
fn keychain_access_denied_serializes_with_kind() {
    let err = AppError::KeychainAccessDenied("macos -25293".into());
    let v: Value = serde_json::to_value(&err).unwrap();
    assert_eq!(v["kind"], "keychain.access_denied");
    assert_eq!(v["code"], 500);
    assert_eq!(v["message"], "Keychain access denied: macos -25293");
}

#[test]
fn oauth_cancelled_serializes_without_message_arg() {
    let err = AppError::OauthCancelled;
    let v: Value = serde_json::to_value(&err).unwrap();
    assert_eq!(v["kind"], "oauth.cancelled");
    assert_eq!(v["message"], "OAuth sign-in was cancelled.");
}
