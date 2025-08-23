// projects/put.rs
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UpdateProjectResponse {
    pub message: String,
    pub updated: bool,
}

pub async fn update_project(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    headers: HeaderMap,
    Json(payload): Json<UpdateProjectRequest>,
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

    // Validar que al menos un campo sea proporcionado para actualizar
    if payload.name.is_none() && payload.color.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "At least one field must be provided for update".to_string(),
            }),
        )
            .into_response();
    }

    // Validar el nombre si se proporciona
    if let Some(ref name) = payload.name {
        if name.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Project name cannot be empty".to_string(),
                }),
            )
                .into_response();
        }
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
        "SELECT update_project($1, $2, $3, $4)"
    )
    .bind(user_id)
    .bind(project_id)
    .bind(payload.name)
    .bind(payload.color)
    .fetch_one(&pool)
    .await
    {
        Ok(updated) => {
            if updated {
                let response = UpdateProjectResponse {
                    message: "Project updated successfully".to_string(),
                    updated: true,
                };
                (StatusCode::OK, Json(response)).into_response()
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: "Project not found or you don't have permission to update it".to_string(),
                    }),
                )
                    .into_response()
            }
        }
        Err(e) => {
            let error_message = format!("Error updating project: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}