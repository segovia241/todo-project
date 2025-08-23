# Etapa de build
FROM rust:1.85 AS builder

WORKDIR /usr/src/app
COPY . .

# Instala dependencias y compila
RUN cargo build --release

# Usa Debian bookworm que tiene libssl3
FROM debian:bookworm-slim
WORKDIR /usr/src/app

# Instalamos psql (bookworm ya tiene libssl3)
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copiamos el binario compilado
COPY --from=builder /usr/src/app/target/release/main-ms ./main-ms

# Copiamos migraciones SQL
COPY migrations/ ./migrations/

EXPOSE 8080

# Script con parámetros explícitos (sin .env)
CMD ["sh", "-c", "until pg_isready -h main-db -p 5432; do echo 'Esperando DB...'; sleep 2; done; echo 'DB lista!'; PGPASSWORD=postgres psql -h main-db -U postgres -d main_db -f migrations/init.sql && echo 'Migraciones aplicadas!'; ./main-ms"]