# 📝 To-Do Project (Prueba Técnica Rust Full-Stack)

## 🖥️ Instrucciones por SO

### Linux

```bash
git clone https://github.com/segovia241/todo-project.git
cd todo-project
sudo docker compose up --build
```

### Windows (PowerShell con Docker Desktop)

```powershell
git clone https://github.com/segovia241/todo-project.git
cd todo-project
docker compose up --build
```

---

## 🚀 Stack Tecnológico

* **Backend principal (`main-ms`)**

  * Lenguaje: [Rust](https://www.rust-lang.org/)
  * Framework: [Axum](https://github.com/tokio-rs/axum)
  * ORM: [SQLx](https://github.com/launchbadge/sqlx)
  * Autenticación vía JWT
  * Validaciones con `validator`

* **Microservicio de Autenticación (`auth-ms`)**

  * Rust + Axum + SQLx
  * Registro, login, gestión de usuarios y emisión de JWT

* **Frontend Web (`frontend`)**

  * [React](https://react.dev/) + Vite + TypeScript
  * UI moderna, responsiva y con integración con el backend

* **Persistencia**

  * PostgreSQL (con **RLS – Row Level Security**)
  * Migraciones incluidas en cada microservicio
  * Ambas bases de datos trabajan con **funciones almacenadas** para encapsular la lógica de negocio directamente en la base de datos

* **Infraestructura**

  * [Docker](https://www.docker.com/) + Docker Compose

* **Aplicación de Escritorio (bonus)**

  * [Tauri](https://tauri.app/) + React + Rust

---

## 🏗️ Estructura del Proyecto

```
todo-project/
│── auth-ms/        # Microservicio de autenticación (Rust + Axum + SQLx)
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── migrations/
│   ├── src/
│   └── target/
│── main-ms/        # Backend principal (Rust + Axum + SQLx)
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── migrations/
│   ├── src/
│   └── target/
│── frontend/       # Frontend en React + Vite + TS
│   ├── dist/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   ├── src/
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── README.md
│   ├── src-tauri/
│   └── vite.config.ts
│── docker-compose.yml
```

---

## 🗄️ Base de Datos

### auth-ms (Microservicio de Autenticación)

**Tabla de usuarios**

* Contiene información de los usuarios: email, contraseña hasheada, fecha de creación y último login.
* Se aplican políticas RLS para que cada usuario vea y actualice solo sus propios datos, y para validar login y registro seguro.

**Políticas implementadas**

* Verificación de login por email y contraseña
* Usuarios pueden ver solo sus propios datos
* Usuarios pueden actualizar solo sus propios datos
* Permitir registro de nuevos usuarios

---

### main-ms (Backend Principal)

**Tablas y relaciones**

* **user\_profiles:** perfil de cada usuario
* **projects:** proyectos asociados a un usuario
* **tasks:** tareas con título, descripción, status, prioridad y fecha de vencimiento
* **tags:** etiquetas con nombre y color
* **task\_tags:** tabla de unión entre tareas y etiquetas

**Políticas RLS implementadas**

* Cada usuario solo puede acceder a sus propios perfiles, proyectos, tareas y etiquetas
* Relación en `task_tags` asegura que solo se puedan vincular tareas y tags que pertenezcan al usuario
* Uso de `current_setting('app.current_user_id')` para identificar al usuario activo en cada operación

---

## ⚙️ Variables de Entorno

Ejemplos de configuración:

**auth-ms/.env**

```env
DATABASE_URL=postgres://postgres:postgres@auth-db:5432/auth_db
PORT=8080
JWT_SECRET=supersecret
```

**main-ms/.env**

```env
DATABASE_URL=postgres://postgres:postgres@main-db:5432/main_db
AUTH_MICROSERVICE_URL=http://auth-ms:8080
PORT=8080
```

**frontend/.env**

```env
VITE_API_URL=http://localhost:8080
```

---

## ▶️ Ejecución Recomendada (Docker)

```bash
git clone https://github.com/segovia241/todo-project.git
cd todo-project
sudo docker compose up --build
```

Esto levantará:

* **Auth MS** → `http://localhost:3000`
* **Main MS** → `http://localhost:8080`
* **Frontend** → `http://localhost:8081`

---

## 🔐 Seguridad

* JWT con expiración de **24 horas**
* Contraseñas hasheadas con **bcrypt**
* Variables de entorno protegen credenciales y URLs de servicios
* PostgreSQL con **Row Level Security (RLS)** asegura que cada usuario solo acceda a sus propios datos
* Funciones almacenadas en PostgreSQL para encapsular lógica y reforzar seguridad

---

## 📌 Funcionalidades Implementadas

* ✅ Registro y login de usuarios (JWT)
* ✅ CRUD de tareas y proyectos
* ✅ Filtros (status, prioridad, tags, due\_date)
* ✅ Paginación y ordenamiento (server-side)
* ✅ Validaciones (ej. título obligatorio, fechas válidas)
* ✅ UI responsiva con persistencia de filtros en URL
* ✅ Políticas RLS en PostgreSQL
* ✅ Funciones almacenadas para comunicación segura
* ✅ Empaquetado reproducible con Docker Compose
* ⚡ Bonus: compilación escritorio con **Tauri**

---

## 📡 Endpoints Básicos

### Autenticación

```http
POST /auth/register
POST /auth/login
```

### Tareas

```http
GET    /tasks
POST   /tasks
GET    /tasks/{id}
PUT    /tasks/{id}
DELETE /tasks/{id}
```

---

## 📖 Decisiones Técnicas

* **Axum + SQLx en lugar de Actix/Diesel**
  Axum por su ergonomía y ecosistema moderno basado en Tokio. SQLx permite queries asincrónicas y chequeo en compilación.

* **Separación en auth-ms y main-ms**
  Microservicios independientes para escalabilidad y seguridad.

* **Uso de RLS en PostgreSQL**
  Garantiza que ningún usuario acceda a datos de otros, reduciendo la complejidad en la capa de negocio.

* **Funciones almacenadas**
  Centralizan la lógica crítica en la base de datos, aseguran consistencia y refuerzan restricciones de seguridad.
