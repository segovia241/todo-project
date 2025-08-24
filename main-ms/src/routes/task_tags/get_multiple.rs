// task_tags/get_multiple.rs
use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Deserialize)]
pub struct MultipleTagsQuery {
    pub tags: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct TaskIdsResponse {
    pub task_ids: Vec<Uuid>,
}

pub async fn get_tasks_by_multiple_tags(
    State(pool): State<PgPool>,
    Query(query_params): Query<MultipleTagsQuery>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Extraer el token de los headers usando la función externa
    let token = match extract_token_from_headers(&headers) {
        Ok(token) => token,
        Err(error_response) => return error_response.into_response(),
    };

    // Extraar el user_id usando el token
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

    // Verificar que se hayan proporcionado tags
    if query_params.tags.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "At least one tag must be provided".to_string(),
            }),
        )
            .into_response();
    }

    // Ejecutar la función de la base de datos para cada tag y luego intersectar los resultados
    let mut all_tasks: Option<Vec<Uuid>> = None;

    for tag_id in query_params.tags {
        match sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM get_tasks_by_tag($1, $2)"
        )
        .bind(user_id)
        .bind(tag_id)
        .fetch_all(&pool)
        .await
        {
            Ok(tasks_for_tag) => {
                if let Some(current_tasks) = all_tasks {
                    // Intersectar con los resultados existentes
                    let intersection: Vec<Uuid> = current_tasks
                        .into_iter()
                        .filter(|task_id| tasks_for_tag.contains(task_id))
                        .collect();
                    
                    all_tasks = Some(intersection);
                    
                    // Si la intersección está vacía, podemos terminar temprano
                    if all_tasks.as_ref().unwrap().is_empty() {
                        break;
                    }
                } else {
                    // Primer conjunto de resultados
                    all_tasks = Some(tasks_for_tag);
                }
            }
            Err(e) => {
                let error_message = format!("Error fetching tasks for tag {}: {}", tag_id, e);
                eprintln!("{}", error_message);
                
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: error_message }),
                )
                    .into_response();
            }
        }
    }

    match all_tasks {
        Some(task_ids) => {
            let response = TaskIdsResponse { task_ids };
            (StatusCode::OK, Json(response)).into_response()
        }
        None => {
            // Esto debería ocurrir solo si no se procesó ningún tag
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "No tags were processed".to_string(),
                }),
            )
                .into_response()
        }
    }
}