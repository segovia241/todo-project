// projects/get.rs
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
pub struct Project {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub color: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct ProjectsResponse {
    pub projects: Vec<Project>,
}

#[derive(Debug, Serialize)]
pub struct ProjectResponse {
    pub project: Option<Project>,
}

pub async fn get_projects(
    State(pool): State<PgPool>,
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

    // Ejecutar la función de la base de datos para obtener todos los proyectos del usuario
    match sqlx::query_as::<_, Project>(
        "SELECT * FROM get_user_projects($1)"
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(projects) => {
            let response = ProjectsResponse { projects };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error fetching projects: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}

pub async fn get_project_by_id(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
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

    // Ejecutar la función de la base de datos para obtener un proyecto específico
    match sqlx::query_as::<_, Project>(
        "SELECT * FROM get_project($1, $2)"
    )
    .bind(user_id)
    .bind(project_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(project)) => {
            let response = ProjectResponse { project: Some(project) };
            (StatusCode::OK, Json(response)).into_response()
        }
        Ok(None) => {
            (
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "Project not found or you don't have permission to view it".to_string(),
                }),
            )
                .into_response()
        }
        Err(e) => {
            let error_message = format!("Error fetching project: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}