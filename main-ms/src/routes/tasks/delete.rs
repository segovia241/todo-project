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

#[derive(Debug, Serialize)]
pub struct DeleteTaskResponse {
    pub message: String,
    pub deleted: bool,
}


pub async fn delete_task(
    State(pool): State<PgPool>,
    Path(task_id): Path<Uuid>,
    headers: HeaderMap,
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

    // Ejecutar la función de la base de datos para eliminar la tarea
    match sqlx::query_scalar(
        "SELECT delete_task($1, $2)"
    )
    .bind(user_id)
    .bind(task_id)
    .fetch_one(&pool)
    .await
    {
        Ok(deleted) => {
            if deleted {
                let response = DeleteTaskResponse {
                    message: "Task deleted successfully".to_string(),
                    deleted: true,
                };
                (StatusCode::OK, Json(response)).into_response()
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: "Task not found or you don't have permission to delete it".to_string(),
                    }),
                )
                    .into_response()
            }
        }
        Err(e) => {
            let error_message = format!("Error deleting task: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}