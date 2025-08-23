// routes/login.rs
use axum::{
    extract::State,
    response::{Json, IntoResponse},
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use reqwest::{Client, StatusCode};
use sqlx::PgPool;
use uuid::Uuid;
use std::env;

#[derive(Debug, Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    token: String,
    user_id: Uuid,
    message: String,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Debug, Deserialize)]
struct AuthResponse {
    user: UserResponse,
    token: String,
}

#[derive(Debug, Deserialize)]
struct AuthErrorResponse {
    error: String,
}

#[derive(Debug, Deserialize)]
struct UserResponse {
    id: Uuid,
    email: String,
    created_at: String,
}

pub fn routes(base: &str) -> Router<PgPool> {
    Router::new().route(&format!("{}", base), post(login))
}

async fn login(
    State(_pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // Obtener la URL del microservicio de autenticación desde las variables de entorno
    let auth_service_url = env::var("AUTH_MICROSERVICE_URL")
        .expect("AUTH_MICROSERVICE_URL must be set in .env file");
    
    let login_url = format!("{}/api/login", auth_service_url);

    // Autenticar usuario en el microservicio de autenticación
    let client = Client::new();
    let response = client
        .post(&login_url)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "email": payload.email,
            "password": payload.password
        }))
        .send()
        .await;

    let response = match response {
        Ok(resp) => resp,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { 
                    error: format!("Error calling auth service: {}", e) 
                })
            ).into_response()
        }
    };

    // Verificar el status code de la respuesta
    let status = response.status();
    
    if status.is_success() {
        // Si es exitoso, parsear la respuesta
        match response.json::<AuthResponse>().await {
            Ok(auth_response) => {
                let response = LoginResponse {
                    token: auth_response.token,
                    user_id: auth_response.user.id,
                    message: "Login exitoso".to_string(),
                };
                Json(response).into_response()
            }
            Err(e) => {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { 
                        error: format!("Error parsing auth response: {}", e) 
                    })
                ).into_response()
            }
        }
    } else {
        // Si hay error, parsear el mensaje de error
        match response.json::<AuthErrorResponse>().await {
            Ok(error_response) => {
                let status_code = StatusCode::from_u16(status.as_u16())
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                
                (status_code, Json(ErrorResponse { error: error_response.error })).into_response()
            }
            Err(e) => {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { 
                        error: format!("Error parsing auth error response: {}", e) 
                    })
                ).into_response()
            }
        }
    }
}