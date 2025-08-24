use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row}; // Añadir Row aquí
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Deserialize)]
pub struct GetTasksQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<Uuid>,
    pub search: Option<String>,
    pub sort_by: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskResponse {
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
pub struct TasksResponse {
    pub tasks: Vec<TaskResponse>,
    pub message: String,
    pub total_count: i64,
    pub page: i32,
    pub limit: i32,
    pub total_pages: i32,
}

// Endpoint para obtener todas las tareas del usuario con filtros opcionales
pub async fn get_tasks(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(query): Query<GetTasksQuery>,
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

    // Validar status si se proporciona
    if let Some(ref status) = query.status {
        if !["todo", "doing", "done"].contains(&status.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid status. Must be one of: todo, doing, done".to_string(),
                }),
            )
                .into_response();
        }
    }

    // Validar priority si se proporciona
    if let Some(ref priority) = query.priority {
        if !["low", "med", "high", "urgent"].contains(&priority.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid priority. Must be one of: low, med, high, urgent".to_string(),
                }),
            )
                .into_response();
        }
    }

    if let Some(ref sort_by) = query.sort_by {
        if !["title", "priority", "due_date"].contains(&sort_by.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid sort_by. Must be one of: title, priority, due_date".to_string(),
                }),
            )
                .into_response();
        }
    }

    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * limit;

    let total_count_result = sqlx::query(
        "SELECT COUNT(*) as count FROM get_user_tasks_count($1, $2::task_status, $3::task_priority, $4, $5)"
    )
    .bind(user_id)
    .bind(&query.status)
    .bind(&query.priority)
    .bind(query.project_id)
    .bind(&query.search)
    .fetch_one(&pool)
    .await;

    let total_count: i64 = match total_count_result {
        Ok(row) => row.try_get("count").unwrap_or(0),
        Err(_) => 0,
    };

    let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i32;

    match sqlx::query(
        "SELECT json_agg(t) as tasks FROM get_user_tasks_paginated($1, $2::task_status, $3::task_priority, $4, $5, $6, $7, $8) t"
    )
    .bind(user_id)
    .bind(&query.status)
    .bind(&query.priority)
    .bind(query.project_id)
    .bind(&query.search)
    .bind(&query.sort_by)
    .bind(limit)
    .bind(offset)
    .fetch_one(&pool)
    .await
    {
        Ok(row) => {
            let tasks_json: Option<serde_json::Value> = row.try_get("tasks").unwrap_or(None);
            
            match tasks_json {
                Some(serde_json::Value::Array(arr)) if !arr.is_empty() => {
                    match serde_json::from_value::<Vec<TaskResponse>>(serde_json::Value::Array(arr)) {
                        Ok(tasks) => {
                            let response = TasksResponse {
                                tasks,
                                message: "Tasks retrieved successfully".to_string(),
                                total_count,
                                page,
                                limit,
                                total_pages,
                            };
                            (StatusCode::OK, Json(response)).into_response()
                        }
                        Err(e) => {
                            let error_message = format!("Error parsing tasks: {}", e);
                            eprintln!("{}", error_message);
                            
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(ErrorResponse { error: error_message }),
                            )
                                .into_response()
                        }
                    }
                }
                _ => {
                    let response = TasksResponse {
                        tasks: Vec::new(),
                        message: "No tasks found".to_string(),
                        total_count,
                        page,
                        limit,
                        total_pages,
                    };
                    (StatusCode::OK, Json(response)).into_response()
                }
            }
        }
        Err(e) => {
            let error_message = format!("Error retrieving tasks: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}


// Endpoint para obtener una tarea específica por ID
pub async fn get_task_by_id(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Path(task_id): Path<Uuid>,
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

    // Usar query directamente y luego deserializar manualmente
    match sqlx::query(
        "SELECT json_agg(t) as task FROM get_task($1, $2) t"
    )
    .bind(user_id)
    .bind(task_id)
    .fetch_one(&pool)
    .await
    {
        Ok(row) => {
            let task_json: Option<serde_json::Value> = row.try_get("task").unwrap_or(None);
            
            match task_json {
                Some(serde_json::Value::Array(arr)) if !arr.is_empty() => {
                    match serde_json::from_value::<Vec<TaskResponse>>(serde_json::Value::Array(arr)) {
                        Ok(mut tasks) => {
                            if let Some(task) = tasks.pop() {
                                (StatusCode::OK, Json(task)).into_response()
                            } else {
                                (
                                    StatusCode::NOT_FOUND,
                                    Json(ErrorResponse {
                                        error: "Task not found".to_string(),
                                    }),
                                )
                                    .into_response()
                            }
                        }
                        Err(e) => {
                            let error_message = format!("Error parsing task: {}", e);
                            eprintln!("{}", error_message);
                            
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(ErrorResponse { error: error_message }),
                            )
                                .into_response()
                        }
                    }
                }
                _ => {
                    (
                        StatusCode::NOT_FOUND,
                        Json(ErrorResponse {
                            error: "Task not found".to_string(),
                        }),
                    )
                        .into_response()
                }
            }
        }
        Err(e) => {
            let error_message = format!("Error retrieving task: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}
