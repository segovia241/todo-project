use std::net::SocketAddr;
use tokio::net::TcpListener;

use axum::{
    http::{HeaderValue, Method, Request},
    middleware::Next,
    response::Response,
    middleware::from_fn,
};

mod routes;
mod db;
pub mod utils;

// Middleware CORS siguiendo docs.rs
// Middleware CORS siguiendo docs.rs
async fn cors(req: Request<axum::body::Body>, next: Next) -> Response {
    // Responder preflight OPTIONS
    if req.method() == Method::OPTIONS {
        let mut res = Response::new("".into());
        let headers = res.headers_mut();
        headers.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
        headers.insert(
            "Access-Control-Allow-Methods",
            HeaderValue::from_static("GET,POST,PUT,DELETE,OPTIONS"),
        );
        headers.insert(
            "Access-Control-Allow-Headers",
            HeaderValue::from_static("Authorization, Content-Type"),
        );
        return res;
    }

    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
    headers.insert(
        "Access-Control-Allow-Methods",
        HeaderValue::from_static("GET,POST,PUT,DELETE,OPTIONS"),
    );
    headers.insert(
        "Access-Control-Allow-Headers",
        HeaderValue::from_static("Authorization, Content-Type"),
    );
    res
}

#[tokio::main]
async fn main() {
    // Conexión a DB
    let pool = db::connect().await;

    // Cargar rutas desde el módulo routes y aplicar middleware CORS
    let app = routes::app()
        .with_state(pool)
        .layer(from_fn(cors));

    // Dirección del servidor
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("🚀 Servidor escuchando en http://{}", addr);

    // Crear listener
    let listener = TcpListener::bind(addr).await.unwrap();

    // Levantar servidor
    axum::serve(listener, app).await.unwrap();
}
