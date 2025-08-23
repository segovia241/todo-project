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
        .route(&format!("{}", base), post(post::create_tag))
        .route(&format!("{}", base), get(get::get_tags))
        .route(&format!("{}/{{tag_id}}", base), put(put::update_tag))
        .route(&format!("{}/{{tag_id}}", base), delete(delete::delete_tag))
}