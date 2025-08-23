// tags/post.rs
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub normalized_name: String,
    pub display_name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateTagResponse {
    pub tag_id: Uuid,
    pub message: String,
}

pub async fn create_tag(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<CreateTagRequest>,
) -> impl IntoResponse {
    // Extraer el token de los headers usando la función externa
    let token = match extract_token_from_headers(&headers) {
        Ok(token) => token,
        Err(error_response) => return error_response.into_response(),
    };

    // Extraer el user_id usando el token
    let user_id = match extract_user_id(&token).await {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: "Invalid or expired token".to_string(),
                }),
            )
                .into_response()
        }
    };

    // Validar que el normalized_name no esté vacío
    if payload.normalized_name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Tag normalized name is required".to_string(),
            }),
        )
            .into_response();
    }

    // Validar formato del color si se proporciona (opcional: código HEX)
    if let Some(ref color) = payload.color {
        if !color.is_empty() && !color.starts_with('#') {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Color must be in HEX format (e.g., #FF5733)".to_string(),
                }),
            )
                .into_response();
        }
    }

    // Ejecutar la función de la base de datos
    match sqlx::query_scalar(
        "SELECT create_tag($1, $2, $3, $4)"
    )
    .bind(user_id)
    .bind(&payload.normalized_name)
    .bind(payload.display_name)
    .bind(payload.color)
    .fetch_one(&pool)
    .await
    {
        Ok(tag_id) => {
            let response = CreateTagResponse {
                tag_id,
                message: "Tag created successfully".to_string(),
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error creating tag: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}