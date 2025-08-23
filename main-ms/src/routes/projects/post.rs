// projects/post.rs
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
pub struct CreateProjectRequest {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateProjectResponse {
    pub project_id: Uuid,
    pub message: String,
}

pub async fn create_project(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<CreateProjectRequest>,
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

    // Validar que el nombre no esté vacío
    if payload.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Project name is required".to_string(),
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
        "SELECT create_project($1, $2, $3)"
    )
    .bind(user_id)
    .bind(&payload.name)
    .bind(payload.color)
    .fetch_one(&pool)
    .await
    {
        Ok(project_id) => {
            let response = CreateProjectResponse {
                project_id,
                message: "Project created successfully".to_string(),
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error creating project: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}