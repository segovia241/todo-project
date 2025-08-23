// tags/get.rs
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{Json, IntoResponse},
};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::utils::token::extract_user_id;
use crate::utils::extract_token::{extract_token_from_headers, ErrorResponse};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Tag {
    pub id: Uuid,
    pub user_id: Uuid,
    pub normalized_name: String,
    pub display_name: String,
    pub color: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct TagsResponse {
    pub tags: Vec<Tag>,
}

pub async fn get_tags(
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

    // Ejecutar la función de la base de datos para obtener todos los tags del usuario
    match sqlx::query_as::<_, Tag>(
        "SELECT * FROM get_user_tags($1)"
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(tags) => {
            let response = TagsResponse { tags };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            let error_message = format!("Error fetching tags: {}", e);
            eprintln!("{}", error_message);
            
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: error_message }),
            )
                .into_response()
        }
    }
}