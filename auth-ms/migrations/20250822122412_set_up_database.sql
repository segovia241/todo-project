-- Add migration script here
-- ==========================
-- HABILITAR EXTENSION UUID
-- ==========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================
-- CONFIGURACIÓN INICIAL DE VARIABLES DE APLICACIÓN
-- ==========================
SELECT set_config('app.current_user_id', '', false);
SELECT set_config('app.current_email', '', false);
SELECT set_config('app.current_password', '', false);

-- ==========================
-- TABLA DE USUARIOS (MICROSERVICIO DE AUTENTICACIÓN)
-- ==========================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

-- ==========================
-- ÍNDICES PARA USUARIOS
-- ==========================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ==========================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- ==========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================
-- ROW LEVEL SECURITY (RLS)
-- ==========================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==========================
-- FUNCIÓN PARA OBTENER USER_ID ACTUAL
-- ==========================
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================
-- FUNCIÓN PARA OBTENER USER
-- ==========================
CREATE OR REPLACE FUNCTION get_user_by_id(user_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR,
    user_created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Establecer el current_user_id para RLS (si es necesario)
    EXECUTE format('SET LOCAL app.current_user_id = %L', user_uuid::text);
    
    -- Retornar los datos del usuario
    RETURN QUERY
    SELECT id, email, created_at
    FROM users
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================
-- FUNCIÓN PARA ESTABLECER CREDENCIALES TEMPORALES
-- ==========================
CREATE OR REPLACE FUNCTION set_app_current_credentials(p_email VARCHAR, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM set_config('app.current_email', p_email, false);
    PERFORM set_config('app.current_password', p_password, false);
END;
$$;

-- ==========================
-- CREAR ROL APP_USER
-- ==========================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'apppass';
    END IF;
END
$$;

-- ==========================
-- POLÍTICAS RLS PARA USUARIOS
-- ==========================
-- Política para verificación de login
DROP POLICY IF EXISTS "Allow login verification" ON users;
CREATE POLICY "Allow login verification"
ON users FOR SELECT
TO app_user
USING (
    email = current_setting('app.current_email', true)::VARCHAR
    AND password_hash = crypt(
        current_setting('app.current_password', true)::TEXT, 
        password_hash
    )
);

-- Política para que usuarios vean sus propios datos
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (id = current_user_id());

-- Política para que usuarios actualicen sus propios datos
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (id = current_user_id())
WITH CHECK (id = current_user_id());

-- Política para permitir registro de usuarios
DROP POLICY IF EXISTS "Allow user registration" ON users;
CREATE POLICY "Allow user registration"
ON users FOR INSERT
TO app_user
WITH CHECK (email IS NOT NULL AND password_hash IS NOT NULL);

-- ==========================
-- FUNCIÓN DE REGISTRO DE USUARIO
-- ==========================
CREATE OR REPLACE FUNCTION register_user(
    p_email VARCHAR(255),
    p_password TEXT
)
RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Validar formato de email
    IF p_email !~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Verificar que el email no exista
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Insertar nuevo usuario con password hasheado
    INSERT INTO users (
        email,
        password_hash
    ) VALUES (
        p_email,
        crypt(p_password, gen_salt('bf'))
    )
    RETURNING id INTO new_user_id;

    -- Retornar los datos del usuario creado
    RETURN QUERY
    SELECT 
        u.id,
        u.email AS user_email,
        u.created_at
    FROM users u
    WHERE u.id = new_user_id;
END;
$$;

-- ==========================
-- FUNCIÓN DE VERIFICACIÓN DE LOGIN
-- ==========================
CREATE OR REPLACE FUNCTION verify_login_credentials(p_email VARCHAR, p_password TEXT)
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    password_hash TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Establecer credenciales temporales
    PERFORM set_app_current_credentials(p_email, p_password);
    
    -- Obtener el ID del usuario
    SELECT u.id INTO v_user_id
    FROM users u
    WHERE u.email = p_email
    AND u.password_hash = crypt(p_password, u.password_hash);
    
    -- Establecer el user_id en la configuración para RLS
    IF v_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', v_user_id::text, false);
        
        -- Actualizar last_login
        UPDATE users u
        SET last_login = NOW(),
            updated_at = NOW()
        WHERE u.id = v_user_id;
        
        -- Retornar los datos del usuario
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u.password_hash,
            u.created_at
        FROM users u
        WHERE u.id = v_user_id;
    END IF;
    
    -- Limpiar credenciales temporales
    PERFORM set_config('app.current_email', '', true);
    PERFORM set_config('app.current_password', '', true);
    PERFORM set_config('app.current_user_id', '', true);
END;
$$;



-- ==========================
-- CONCEDER PERMISOS
-- ==========================
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

GRANT EXECUTE ON FUNCTION verify_login_credentials TO app_user;
GRANT EXECUTE ON FUNCTION set_app_current_credentials TO app_user;
GRANT EXECUTE ON FUNCTION register_user TO app_user;
GRANT EXECUTE ON FUNCTION current_user_id TO app_user;
GRANT EXECUTE ON FUNCTION get_user_by_id TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE ON users TO app_user;

-- Permisos por defecto en las tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE ON TABLES TO app_user;