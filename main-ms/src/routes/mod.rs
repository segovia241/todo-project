use axum::Router;
use sqlx::PgPool;

// Rutas
pub mod tasks;
pub mod tags;
pub mod me;
pub mod register;
pub mod login;
pub mod projects;
pub mod task_tags;

pub fn app() -> Router<PgPool> {
    Router::new()
        .nest("/api/v1", api_routes())
}

fn api_routes() -> Router<PgPool> {
    Router::new()
        .merge(tasks::routes("/tasks"))
        .merge(tags::routes("/tags"))
        .merge(register::routes("/auth/register"))
        .merge(login::routes("/auth/login"))
        .merge(me::routes("/me"))
        .merge(projects::routes("/projects"))
        .merge(task_tags::routes("/task_tags"))
        
}