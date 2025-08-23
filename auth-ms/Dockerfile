FROM rust:1.76 as builder

WORKDIR /usr/src/app
COPY . .

# Instala sqlx-cli (para correr migraciones si lo necesitas)
RUN cargo install sqlx-cli --version 0.7.0

# Compila en release
RUN cargo build --release

# Imagen final más ligera
FROM debian:bullseye-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/target/release/auth-backend .
COPY .env .env

EXPOSE 8080
CMD ["./auth-backend"]
