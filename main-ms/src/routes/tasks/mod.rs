use axum::{
    routing::{get, post, put, delete}, 
    Router
};
use sqlx::PgPool;

mod get;
mod post;
mod put;
mod delete;

pub fn routes(base: &str) -> Router<PgPool> {
    Router::new()
        .route(&format!("{}", base), post(post::create_task))
        .route(&format!("{}", base), get(get::get_tasks))
        .route(&format!("{}/{{task_id}}", base), get(get::get_task_by_id))
        .route(&format!("{}/{{task_id}}", base), put(put::update_task))
        .route(&format!("{}/{{task_id}}", base), delete(delete::delete_task))
}