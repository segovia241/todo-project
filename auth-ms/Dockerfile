# Etapa de build
FROM rust:1.85 AS builder

WORKDIR /usr/src/app
COPY . .

# Compila en release
RUN cargo build --release

# Usa Debian bookworm
FROM debian:bookworm-slim
WORKDIR /usr/src/app

# Instalamos psql
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copiamos el binario compilado
COPY --from=builder /usr/src/app/target/release/auth-ms ./auth-ms

# Copiamos migraciones
COPY migrations/ ./migrations/

EXPOSE 8080

# Script con parámetros explícitos (sin .env)
CMD ["sh", "-c", "until pg_isready -h auth-db -p 5432; do echo 'Esperando DB...'; sleep 1; done; PGPASSWORD=postgres psql -h auth-db -U postgres -d auth_db -f migrations/init.sql && echo 'Migraciones aplicadas!'; ./auth-ms"]