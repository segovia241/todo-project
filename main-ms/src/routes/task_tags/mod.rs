// task_tags/mod.rs
use axum::{
    routing::{get, post, delete}, 
    Router
};
use sqlx::PgPool;

mod get;
mod post;
mod delete;

pub fn routes(base: &str) -> Router<PgPool> {
    Router::new()
        .route(&format!("{}/tasks/{{task_id}}/tags/{{tag_id}}", base), post(post::add_tag_to_task))
        .route(&format!("{}/tasks/{{task_id}}/tags/{{tag_id}}", base), delete(delete::remove_tag_from_task))
        .route(&format!("{}/tasks/{{task_id}}/tags", base), get(get::get_task_tags))
        .route(&format!("{}/tags/{{tag_id}}/tasks", base), get(get::get_tasks_by_tag))
}