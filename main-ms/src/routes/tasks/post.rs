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
pub struct CreateTaskRequest {
    pub title: String,
    pub project_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct CreateTaskResponse {
    pub task_id: Uuid,
    pub message: String,
}

pub async fn create_task(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(payload): Json<CreateTaskRequest>,
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

    if payload.title.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Title is required".to_string(),
            }),
        )
            .into_response();
    }

    let status = match payload.status.as_deref() {
    Some("todo") | Some("doing") | Some("done") => {
        payload.status.clone().unwrap()
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
    None => "todo".to_string(),
};

    let priority = match payload.priority.as_deref() {
        Some("low") | Some("med") | Some("high") | Some("urgent") => payload.priority.clone().unwrap(),
        Some(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid priority. Must be one of: low, med, high, urgent".to_string(),
                }),
            )
                .into_response()
        }
        None => "med".to_string(),
    };

    match sqlx::query_scalar(
        "SELECT create_task($1, $2, $3, $4, $5::task_status, $6::task_priority, $7)"
    )
    .bind(user_id)
    .bind(&payload.title)
    .bind(payload.project_id)
    .bind(payload.description)
    .bind(status)
    .bind(priority)
    .bind(payload.due_date)
    .fetch_one(&pool)
    .await
    {
        Ok(task_id) => {
            let response = CreateTaskResponse {
                task_id,
                message: "Task created successfully".to_string(),
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error creating task: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}