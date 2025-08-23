use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres, Row};
use std::{sync::Arc};
use uuid::Uuid;
use validator::Validate;
use log::{error};

#[derive(Debug, Clone)]
struct AppState {
    pool: Pool<Postgres>,
    jwt_secret: String,
}

#[derive(Debug, Deserialize, Validate)]
struct RegisterRequest {
    #[validate(email)]
    email: String,
    #[validate(length(min = 6))]
    password: String,
}

#[derive(Debug, Deserialize, Validate)]
struct LoginRequest {
    #[validate(email)]
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct UserResponse {
    id: Uuid,
    email: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    user: UserResponse,
    token: String,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

// JWT payload structure
#[derive(Debug, Serialize, Deserialize)]
struct JwtPayload {
    id: Uuid,
    email: String,
}

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Authentication error: {0}")]
    Auth(String),
    #[error("JWT error: {0}")]
    Jwt(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match self {
            AppError::Database(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::Validation(e) => (StatusCode::BAD_REQUEST, e),
            AppError::Auth(e) => (StatusCode::UNAUTHORIZED, e),
            AppError::Jwt(e) => (StatusCode::INTERNAL_SERVER_ERROR, e),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await?;

    let state = Arc::new(AppState {
        pool,
        jwt_secret: jwt_secret.clone(),
    });

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/register", post(register))
        .route("/api/login", post(login))
        .route("/api/me", get(get_current_user))
        .with_state(state)
        .layer(tower_http::cors::CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("Server running on http://localhost:3000");
    
    axum::serve(listener, app).await?;
    
    Ok(())
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "Server is healthy")
}

async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    let row = sqlx::query(
        r#"
        SELECT user_id, user_email, created_at
        FROM register_user($1, $2)
        "#,
    )
    .bind(&payload.email)
    .bind(&payload.password)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("Email already registered") {
            AppError::Validation("Email already registered".to_string())
        } else if e.to_string().contains("Invalid email format") {
            AppError::Validation("Invalid email format".to_string())
        } else {
            AppError::Database(e)
        }
    })?;

    let user_id: Uuid = row.get("user_id");
    let user_email: String = row.get("user_email");
    let created_at: DateTime<Utc> = row.get("created_at");

    let user_response = UserResponse {
        id: user_id,
        email: user_email.clone(), // Clone here for the response
        created_at,
    };

    // Use cloned values for JWT payload
    let jwt_payload = JwtPayload {
        id: user_id,
        email: user_email,        // This moves user_email
    };

    let token = create_jwt(&jwt_payload, &state.jwt_secret)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            user: user_response,
            token,
        }),
    ))
}

async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    let row = sqlx::query(
        r#"
        SELECT id, email, created_at
        FROM verify_login_credentials($1, $2)
        "#,
    )
    .bind(&payload.email)
    .bind(&payload.password)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    let row = row.ok_or_else(|| AppError::Auth("Invalid credentials".to_string()))?;

    let id: Uuid = row.get("id");
    let email: String = row.get("email");
    let created_at: DateTime<Utc> = row.get("created_at");

    let user_response = UserResponse {
        id,
        email: email.clone(),
        created_at,
    };

    // Usar valores por defecto temporalmente
    let jwt_payload = JwtPayload {
        id,
        email,
    };

    let token = create_jwt(&jwt_payload, &state.jwt_secret)?;

    Ok((
        StatusCode::OK,
        Json(AuthResponse {
            user: user_response,
            token,
        }),
    ))
}

async fn get_current_user(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    // Log de inicio de la función
    println!("Iniciando la obtención del usuario actual");

    // Extraer el token del encabezado
    let token = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| {
            error!("Token ausente o inválido en los encabezados");
            AppError::Auth("Missing or invalid token".to_string())
        })?;

    // Log de token extraído
    println!("Token extraído exitosamente del encabezado");

    // Extraer el user_id del token
    let user_id = match extract_user_id(token, &state.jwt_secret) {
        Ok(id) => {
            println!("ID de usuario extraído correctamente del token");
            id
        }
        Err(e) => {
            error!("Error al extraer el ID de usuario del token: {}", e);
            return Err(AppError::Auth(format!("Invalid token: {}", e)));
        }
    };

    // Log de consulta a la base de datos
    println!("Consultando la base de datos para el usuario con ID: {}", user_id);
    
    // Log de la consulta SQL
    println!("Consulta SQL que se ejecutará: SELECT * FROM get_user_by_id($1) WHERE id = {}", user_id);

    // Realizar la consulta en la base de datos
    let row = match sqlx::query(
        r#"
            SELECT * FROM get_user_by_id($1)
            "#
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            println!("Error al ejecutar la consulta en la base de datos: {}", e);
            return Err(AppError::Database(e.into()));
        }
    };

    // Log si la consulta fue exitosa
    println!("Consulta a la base de datos completada con éxito");

    // Extraer los valores de la fila
    let id: Uuid = row.get("user_id");
    let email: String = row.get("user_email");
    let created_at: DateTime<Utc> = row.get("user_created_at");

    // Log de la respuesta del usuario
    println!("Usuario encontrado: ID = {}, Email = {}", id, email);

    let user_response = UserResponse {
        id,
        email,
        created_at,
    };

    // Log de respuesta exitosa
    println!("Respuesta con datos del usuario preparada exitosamente");

    Ok((StatusCode::OK, Json(user_response)))
}


/// Función que recibe un token JWT y retorna el Uuid del usuario
fn extract_user_id(token: &str, secret: &str) -> Result<Uuid, AppError> {
    let token_data = decode::<JwtPayload>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ).map_err(|e| AppError::Jwt(format!("Error decodificando token: {}", e)))?;

    Ok(token_data.claims.id)
}

/// Función para generar JWT
fn create_jwt(payload: &JwtPayload, secret: &str) -> Result<String, AppError> {
    use chrono::Utc;
    
    // Agregar expiración (24 horas)
    let exp = Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .expect("Invalid timestamp")
        .timestamp() as usize;

    // Claims con expiración
    #[derive(Debug, Serialize, Deserialize)]
    struct Claims {
        id: Uuid,
        email: String,
        exp: usize,
    }

    let claims = Claims {
        id: payload.id,
        email: payload.email.clone(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|e| AppError::Jwt(e.to_string()))
}