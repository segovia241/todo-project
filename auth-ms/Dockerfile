# Etapa de build
FROM rust:1.85 AS builder

WORKDIR /usr/src/app
COPY . .

# Instala sqlx-cli para migraciones
RUN cargo install sqlx-cli


# Compila en release
RUN cargo build --release

# Imagen final más ligera
FROM debian:bullseye-slim
WORKDIR /usr/src/app

# Copiamos el binario compilado
COPY --from=builder /usr/src/app/target/release/auth-ms ./auth-ms

# Copiamos el .env
COPY .env .env

EXPOSE 3000
CMD ["./auth-ms"]
