use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;
use tokio::net::TcpListener;

mod routes;
mod db;
pub mod utils;

#[tokio::main]
async fn main() {
    // Conexión a DB
    let pool = db::connect().await;

    // 👇 Configuración CORRECTA de CORS con tower-http
    let cors = CorsLayer::new()
        .allow_origin(Any) // Permite cualquier origen
        .allow_methods(Any) // Permite cualquier método
        .allow_headers(Any) // Permite cualquier header
        .allow_credentials(false); // Si no usas cookies, false está bien

    // Cargar rutas y aplicar CORS
    let app = routes::app()
        .with_state(pool)
        .layer(cors); // 👈 Aplica el layer de CORS

    // Dirección del servidor - IMPORTANTE para Docker
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080)); // 👈 Cambia a 0.0.0.0
    println!("🚀 Servidor escuchando en http://{}", addr);

    // Crear listener
    let listener = TcpListener::bind(addr).await.unwrap();

    // Levantar servidor
    axum::serve(listener, app).await.unwrap();
}