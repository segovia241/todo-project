use reqwest::Client;
use uuid::Uuid;
use serde::Deserialize;
use std::env;

// Estructura para parsear la respuesta del servicio de autenticación
#[derive(Deserialize, Debug)]
struct AuthResponse {
    id: String,
}
pub async fn extract_user_id(token: &str) -> Result<Uuid, String> {
    println!("[DEBUG] Starting extract_user_id function");
    println!("[DEBUG] Received token: '{}'", token);
    
    // Validar que el token no esté vacío
    if token.trim().is_empty() {
        println!("[ERROR] Token is empty");
        return Err("Empty token".to_string());
    }
    println!("[DEBUG] Token validation passed");

    // Obtener URL del microservicio de autenticación
    println!("[DEBUG] Reading AUTH_MICROSERVICE_URL environment variable");
    let auth_url = env::var("AUTH_MICROSERVICE_URL")
        .unwrap_or_else(|_| {
            println!("[WARN] AUTH_MICROSERVICE_URL not set, using default: http://localhost:3000");
            "http://localhost:3000".to_string()
        });
    
    println!("[DEBUG] Auth URL: {}", auth_url);
    let auth_endpoint = format!("{}/api/me", auth_url);
    println!("[DEBUG] Auth endpoint: {}", auth_endpoint);
    
    // Crear cliente HTTP
    println!("[DEBUG] Creating HTTP client");
    let client = Client::new();
    
    // Hacer request al microservicio de autenticación
    println!("[DEBUG] Preparing HTTP GET request to auth endpoint");
    println!("[DEBUG] Setting Authorization header with Bearer token");
    println!("[DEBUG] Setting timeout: 5 seconds");
    
    let auth_response_result = client
        .get(&auth_endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await;
    
    println!("[DEBUG] HTTP request completed");
    
    let auth_response = match auth_response_result {
        Ok(response) => {
            println!("[DEBUG] Successfully received response from auth service");
            println!("[DEBUG] Response status: {}", response.status());
            response
        },
        Err(e) => {
            println!("[ERROR] Failed to contact auth service: {}", e);
            return Err(format!("Failed to contact auth service: {}", e));
        }
    };
    
    // Verificar si la respuesta fue exitosa
    println!("[DEBUG] Checking if response status is successful");
    if !auth_response.status().is_success() {
        println!("[ERROR] Auth service returned non-success status: {}", auth_response.status());
        return Err(format!("Invalid token. Auth service status: {}", auth_response.status()));
    }
    println!("[DEBUG] Response status is successful");
    
    // Obtener el cuerpo de la respuesta
    println!("[DEBUG] Reading response body as text");
    let response_text = auth_response.text().await.map_err(|e| {
        println!("[ERROR] Failed to read auth response body: {}", e);
        format!("Failed to read auth response: {}", e)
    })?;
    
    println!("[DEBUG] Response body received: {}", response_text);
    
    // Parsear la respuesta JSON
    println!("[DEBUG] Attempting to parse JSON response");
    let auth_data: AuthResponse = match serde_json::from_str(&response_text) {
        Ok(data) => {
            println!("[DEBUG] Successfully parsed JSON response");
            data
        },
        Err(e) => {
            println!("[ERROR] Failed to parse JSON response: {}", e);
            println!("[ERROR] Raw response: {}", response_text);
            return Err(format!("Failed to parse auth response: {}", e));
        }
    };
    
    println!("[DEBUG] Parsed auth data - ID: '{}'", auth_data.id);
    
    // Validar que el ID no esté vacío
    println!("[DEBUG] Validating user ID is not empty");
    if auth_data.id.trim().is_empty() {
        println!("[ERROR] Empty user ID received from auth service");
        return Err("Empty user ID received from auth service".to_string());
    }
    println!("[DEBUG] User ID validation passed");
    
    // Convertir a UUID
    println!("[DEBUG] Converting user ID string to UUID");
    match Uuid::parse_str(&auth_data.id) {
        Ok(uuid) => {
            println!("[DEBUG] Successfully converted to UUID: {}", uuid);
            println!("[INFO] User ID extraction completed successfully");
            Ok(uuid)
        },
        Err(e) => {
            println!("[ERROR] Failed to parse UUID: {}", e);
            println!("[ERROR] Invalid ID string: '{}'", auth_data.id);
            Err(format!("Invalid UUID format: {}", e))
        }
    }
}