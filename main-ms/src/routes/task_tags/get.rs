// task_tags/get.rs
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TaskTag {
    pub tag_id: Uuid,
    pub normalized_name: String,
    pub display_name: String,
    pub color: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TaskWithTag {
    pub id: Uuid,
    pub user_id: Uuid,
    pub project_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct TaskTagsResponse {
    pub tags: Vec<TaskTag>,
}

#[derive(Debug, Serialize)]
pub struct TasksWithTagResponse {
    pub tasks: Vec<TaskWithTag>,
}

pub async fn get_task_tags(
    State(pool): State<PgPool>,
    Path(task_id): Path<Uuid>,
    headers: HeaderMap,
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

    // Ejecutar la función de la base de datos
    match sqlx::query_as::<_, TaskTag>(
        "SELECT * FROM get_task_tags($1, $2)"
    )
    .bind(user_id)
    .bind(task_id)
    .fetch_all(&pool)
    .await
    {
        Ok(tags) => {
            let response = TaskTagsResponse { tags };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error fetching task tags: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}

pub async fn get_tasks_by_tag(
    State(pool): State<PgPool>,
    Path(tag_id): Path<Uuid>,
    headers: HeaderMap,
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

    // Ejecutar la función de la base de datos
    match sqlx::query_as::<_, TaskWithTag>(
        "SELECT * FROM get_tasks_by_tag($1, $2)"
    )
    .bind(user_id)
    .bind(tag_id)
    .fetch_all(&pool)
    .await
    {
        Ok(tasks) => {
            let response = TasksWithTagResponse { tasks };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error fetching tasks by tag: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}

