use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn connect() -> PgPool {
    dotenvy::dotenv().ok(); // carga variables del .env
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL no está definido");

    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("No se pudo conectar a la base de datos")
}
