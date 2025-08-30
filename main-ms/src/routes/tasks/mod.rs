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
        .route(&format!("{}/config/past-dates-enabled", base), get(get_past_dates_config))
}

async fn get_past_dates_config() -> impl axum::response::IntoResponse {
    use std::env;
    use axum::Json;
    use serde::Serialize;

    #[derive(Serialize)]
    struct PastDatesConfig {
        past_dates_enabled: bool,
    }

    let past_dates_enabled = env::var("PAST_DATES_ENABLED")
        .unwrap_or_else(|_| "false".to_string())
        .to_lowercase() == "true";

    Json(PastDatesConfig { past_dates_enabled })
}