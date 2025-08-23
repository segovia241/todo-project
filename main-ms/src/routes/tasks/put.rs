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
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub project_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct UpdateTaskResponse {
    pub message: String,
    pub updated: bool,
}

pub async fn update_task(
    State(pool): State<PgPool>,
    Path(task_id): Path<Uuid>,
    headers: HeaderMap,
    Json(payload): Json<UpdateTaskRequest>,
) -> impl IntoResponse {
    // Extraer el token de los headers
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
    if payload.title.is_none() 
        && payload.project_id.is_none() 
        && payload.description.is_none() 
        && payload.status.is_none() 
        && payload.priority.is_none() 
        && payload.due_date.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "At least one field must be provided for update".to_string(),
            }),
        )
            .into_response();
    }

    // Validar el título si se proporciona
    if let Some(ref title) = payload.title {
        if title.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Title cannot be empty".to_string(),
                }),
            )
                .into_response();
        }
    }

    // Validar status si se proporciona
let status = match payload.status.as_deref() {
    Some("todo") | Some("doing") | Some("done") => {
        payload.status.clone()
    }
    Some(_) => {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid status. Must be one of: todo, doing, done".to_string(),
            }),
        )
            .into_response()
    }
    None => None,
};

    // Validar priority si se proporciona
    let priority = match payload.priority.as_deref() {
        Some("low") | Some("med") | Some("high") | Some("urgent") => payload.priority.clone(),
        Some(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid priority. Must be one of: low, med, high, urgent".to_string(),
                }),
            )
                .into_response()
        }
        None => None,
    };

    // Ejecutar la función de la base de datos
    match sqlx::query_scalar(
        "SELECT update_task($1, $2, $3, $4, $5, $6::task_status, $7::task_priority, $8)"
    )
    .bind(user_id)
    .bind(task_id)
    .bind(payload.project_id)
    .bind(payload.title)
    .bind(payload.description)
    .bind(status)
    .bind(priority)
    .bind(payload.due_date)
    .fetch_one(&pool)
    .await
    {
        Ok(updated) => {
            if updated {
                let response = UpdateTaskResponse {
                    message: "Task updated successfully".to_string(),
                    updated: true,
                };
                (StatusCode::OK, Json(response)).into_response()
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: "Task not found or you don't have permission to update it".to_string(),
                    }),
                )
                    .into_response()
            }
        }
        Err(e) => {
            let error_message = format!("Error updating task: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}