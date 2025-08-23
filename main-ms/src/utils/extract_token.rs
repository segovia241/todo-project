// utils/extract_token.rs
use axum::{
    http::{HeaderMap, StatusCode, header},
    response::{Json, IntoResponse},
};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub fn extract_token_from_headers(headers: &HeaderMap) -> Result<String, impl IntoResponse> {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Missing authorization header".to_string(),
            }),
        ))?;

    if !auth_header.starts_with("Bearer ") {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Invalid authorization format. Expected 'Bearer <token>'".to_string(),
            }),
        ));
    }

    Ok(auth_header[7..].to_string()) // Remover "Bearer " prefix
}