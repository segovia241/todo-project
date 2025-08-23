// projects/mod.rs
use axum::{
    routing::{get, post, put, delete}, 
    Router
};
use sqlx::PgPool;

mod get;
mod post;  // ← Asegúrate de que esto esté presente
mod put;
mod delete;

pub fn routes(base: &str) -> Router<PgPool> {
    Router::new()
        .route(&format!("{}", base), post(post::create_project))  // ← Y aquí se use
        .route(&format!("{}", base), get(get::get_projects))
        .route(&format!("{}/{{project_id}}", base), get(get::get_project_by_id))
        .route(&format!("{}/{{project_id}}", base), put(put::update_project))
        .route(&format!("{}/{{project_id}}", base), delete(delete::delete_project))
}