# Etapa de build
FROM rust:1.76 as builder

WORKDIR /usr/src/app
COPY . .

# Instala sqlx-cli para migraciones
RUN cargo install sqlx-cli --version 0.7.0

# Compila release
RUN cargo build --release

# Imagen final más ligera
FROM debian:bullseye-slim
WORKDIR /usr/src/app

# Copiamos el binario compilado
COPY --from=builder /usr/src/app/target/release/main-ms ./main-ms

# Copiamos ejemplo de env
COPY .env.example .env

EXPOSE 8081
CMD ["./main-ms"]
