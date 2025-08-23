use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::get,
    Router,
};
use serde_json::json;
use sqlx::{PgPool, Row};
use reqwest::Client;
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub fn routes(base: &str) -> Router<PgPool> {
    Router::new().route(&format!("{}/", base), get(get_me))
}

async fn get_me(
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    println!("🔍 [DEBUG] Iniciando endpoint /me");
    
    // Verificar el header de autorización
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "No token provided"}))))?;

    println!("🔍 [DEBUG] Authorization header encontrado");

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token format"}))))?;

    println!("🔍 [DEBUG] Token extraído: {}", token);

    // Consultar el microservicio de autenticación
    let auth_url = std::env::var("AUTH_MICROSERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    
    println!("🔍 [DEBUG] URL del microservicio de auth: {}", auth_url);

    let client = Client::new();
    let auth_endpoint = format!("{}/api/me", auth_url);
    println!("🔍 [DEBUG] Haciendo request a: {}", auth_endpoint);

    let auth_response = client
        .get(&auth_endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| {
            println!("❌ [ERROR] Error al contactar auth service: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to contact auth service: {}", e)})),
            )
        })?;

    println!("🔍 [DEBUG] Response status del auth service: {}", auth_response.status());

    if !auth_response.status().is_success() {
        println!("❌ [ERROR] Token inválido según auth service. Status: {}", auth_response.status());
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid token"})),
        ));
    }

    let mut auth_data: serde_json::Value = auth_response
        .json()
        .await
        .map_err(|e| {
            println!("❌ [ERROR] Error al parsear response del auth service: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to parse auth response: {}", e)})),
            )
        })?;

    println!("🔍 [DEBUG] Datos del auth service: {:?}", auth_data);

    // Extraer user_id del response del microservicio
    let user_id_str = auth_data["id"]
        .as_str()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Invalid user ID in auth response"}))))?;

    println!("🔍 [DEBUG] User ID del auth response: {}", user_id_str);

    let user_id_uuid = Uuid::parse_str(user_id_str)
        .map_err(|e| {
            println!("❌ [ERROR] Error al parsear UUID: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Invalid UUID format"})))
        })?;

    println!("🔍 [DEBUG] User ID parseado como UUID: {}", user_id_uuid);

    // Obtener información del perfil desde la base de datos
    println!("🔍 [DEBUG] Consultando base de datos para user_id: {}", user_id_uuid);
    
    // Usar query en lugar de query! para evitar verificación en tiempo de compilación
    let profile_row = sqlx::query(
        "SELECT id, user_id, name, created_at FROM get_user_profile($1)"
    )
    .bind(user_id_uuid)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        println!("❌ [ERROR] Error en consulta a la base de datos: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Database error: {}", e)})),
        )
    })?;

    println!("🔍 [DEBUG] Resultado de la consulta a BD: {:?}", profile_row);

    // Agregar datos del perfil al response si existen
    if let Some(row) = profile_row {
        println!("🔍 [DEBUG] Perfil encontrado");
        
        if let Some(obj) = auth_data.as_object_mut() {
            // Extraer valores manualmente usando try_get
            let profile_id: Option<Uuid> = row.try_get("id").ok();
            let profile_user_id: Option<Uuid> = row.try_get("user_id").ok();
            let name: Option<String> = row.try_get("name").ok();
            let created_at: Option<DateTime<Utc>> = row.try_get("created_at").ok();

            if let Some(profile_id) = profile_id {
                println!("🔍 [DEBUG] Agregando profile_id: {}", profile_id);
                obj.insert("profile_id".to_string(), json!(profile_id.to_string()));
            } else {
                println!("🔍 [DEBUG] profile_id es None");
            }
            
            if let Some(profile_user_id) = profile_user_id {
                println!("🔍 [DEBUG] Agregando profile_user_id: {}", profile_user_id);
                obj.insert("profile_user_id".to_string(), json!(profile_user_id.to_string()));
            } else {
                println!("🔍 [DEBUG] profile_user_id es None");
            }
            
            if let Some(name) = name {
                println!("🔍 [DEBUG] Agregando profile_name: {}", name);
                obj.insert("profile_name".to_string(), json!(name));
            } else {
                println!("🔍 [DEBUG] profile_name es None");
            }
            
            if let Some(created_at) = created_at {
                println!("🔍 [DEBUG] Agregando profile_created_at: {:?}", created_at);
                obj.insert("profile_created_at".to_string(), json!(created_at.to_rfc3339()));
            } else {
                println!("🔍 [DEBUG] profile_created_at es None");
            }
        }
    } else {
        println!("🔍 [DEBUG] No se encontró perfil para el usuario");
    }

    println!("🔍 [DEBUG] Response final: {:?}", auth_data);
    println!("✅ [SUCCESS] Request completado exitosamente");

    Ok(Json(auth_data))
}