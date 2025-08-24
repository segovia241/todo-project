-- Add migration script here
-- Add migration script here
-- Crear el rol de usuario para la aplicación
-- Crear el rol de usuario si no existe
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'todo_app_user') THEN
      CREATE ROLE todo_app_user WITH LOGIN PASSWORD 'secure_password_here' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   END IF;
END
$do$;
-- Crear tipos ENUM
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        DROP TYPE task_status CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        DROP TYPE task_priority CASCADE;
    END IF;
END$$;


CREATE TYPE task_status AS ENUM ('todo', 'doing', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'med', 'high');
-- Crear la tabla user_profiles
DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla projects
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla tasks
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'med',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla tags
DROP TABLE IF EXISTS tags CASCADE;
CREATE TABLE tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_normalized_name_per_user UNIQUE (user_id, normalized_name)
);

-- Crear la tabla task_tags (tabla de unión)
DROP TABLE IF EXISTS task_tags CASCADE;
CREATE TABLE task_tags (
    task_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, tag_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_normalized_name ON tags(normalized_name);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para user_profiles
CREATE POLICY user_profiles_policy ON user_profiles
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Crear políticas RLS para projects
CREATE POLICY projects_policy ON projects
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Crear políticas RLS para tasks
CREATE POLICY tasks_policy ON tasks
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Crear políticas RLS para tags
CREATE POLICY tags_policy ON tags
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Crear políticas RLS para task_tags
CREATE POLICY task_tags_policy ON task_tags
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_tags.task_id
            AND t.user_id = current_setting('app.current_user_id')::UUID
        )
        OR
        EXISTS (
            SELECT 1 FROM tags tg
            WHERE tg.id = task_tags.tag_id
            AND tg.user_id = current_setting('app.current_user_id')::UUID
        )
    );



-- Otorgar permisos al rol de usuario
GRANT CONNECT ON DATABASE main_db TO todo_app_user;

GRANT USAGE ON SCHEMA public TO todo_app_user;
GRANT USAGE ON TYPE task_status TO todo_app_user;
GRANT USAGE ON TYPE task_priority TO todo_app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_profiles TO todo_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE projects TO todo_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tasks TO todo_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tags TO todo_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE task_tags TO todo_app_user;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO todo_app_user;

-- Crear función para actualizar el updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at en tasks
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE user_profiles IS 'Perfiles de usuarios del sistema de tareas';
COMMENT ON TABLE projects IS 'Proyectos agrupadores de tareas';
COMMENT ON TABLE tasks IS 'Tareas principales del sistema';
COMMENT ON TABLE tags IS 'Etiquetas para categorizar tareas';
COMMENT ON TABLE task_tags IS 'Relación muchos a muchos entre tareas y etiquetas';
-- 1. FUNCIONES PARA USER_PROFILES

-- Crear perfil de usuario
DROP FUNCTION IF EXISTS create_user_profile(UUID, VARCHAR);
CREATE FUNCTION create_user_profile(
    p_user_id UUID,
    p_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    INSERT INTO user_profiles (user_id, name)
    VALUES (p_user_id, p_name)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Leer perfil de usuario
DROP FUNCTION IF EXISTS get_user_profile(UUID);
CREATE FUNCTION get_user_profile(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name VARCHAR,
    created_at TIMESTAMPTZ   -- ✅ corregido
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT up.id, up.user_id, up.name, up.created_at
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Actualizar perfil de usuario
DROP FUNCTION IF EXISTS update_user_profile(UUID, VARCHAR);
CREATE FUNCTION update_user_profile(
    p_user_id UUID,
    p_name VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    UPDATE user_profiles
    SET name = p_name
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Eliminar perfil de usuario
DROP FUNCTION IF EXISTS delete_user_profile(UUID);
CREATE FUNCTION delete_user_profile(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    DELETE FROM user_profiles
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. FUNCIONES PARA PROJECTS

-- Crear proyecto
DROP FUNCTION IF EXISTS create_project(UUID, VARCHAR, VARCHAR);
CREATE FUNCTION create_project(
    p_user_id UUID,
    p_name VARCHAR,
    p_color VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    INSERT INTO projects (user_id, name, color)
    VALUES (p_user_id, p_name, p_color)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Leer proyectos de usuario
DROP FUNCTION IF EXISTS get_user_projects(UUID);
CREATE FUNCTION get_user_projects(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name VARCHAR,
    color VARCHAR,
    created_at TIMESTAMPTZ   -- ✅ corregido
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.color, p.created_at
    FROM projects p
    WHERE p.user_id = p_user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Leer proyecto específico
DROP FUNCTION IF EXISTS get_project(UUID, UUID);
CREATE FUNCTION get_project(
    p_user_id UUID,
    p_project_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name VARCHAR,
    color VARCHAR,
    created_at TIMESTAMPTZ   -- ✅ corregido
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.color, p.created_at
    FROM projects p
    WHERE p.id = p_project_id AND p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Actualizar proyecto
DROP FUNCTION IF EXISTS update_project(UUID, UUID, VARCHAR, VARCHAR);
CREATE FUNCTION update_project(
    p_user_id UUID,
    p_project_id UUID,
    p_name VARCHAR,
    p_color VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    UPDATE projects
    SET name = p_name, color = p_color
    WHERE id = p_project_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Eliminar proyecto
DROP FUNCTION IF EXISTS delete_project(UUID, UUID);
CREATE FUNCTION delete_project(
    p_user_id UUID,
    p_project_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    DELETE FROM projects
    WHERE id = p_project_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIONES PARA TASKS

-- Crear tarea
DROP FUNCTION IF EXISTS create_task(UUID, VARCHAR, UUID, TEXT, task_status, task_priority, TIMESTAMP);
CREATE FUNCTION create_task(
    p_user_id UUID,
    p_title VARCHAR,
    p_project_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_status task_status DEFAULT 'todo',
    p_priority task_priority DEFAULT 'med',
    p_due_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date)
    VALUES (p_user_id, p_project_id, p_title, p_description, p_status, p_priority, p_due_date)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar tareas
DROP FUNCTION IF EXISTS get_user_tasks_count(UUID, task_status, task_priority, UUID, TEXT);
CREATE OR REPLACE FUNCTION get_user_tasks_count(
    p_user_id UUID,
    p_status task_status DEFAULT NULL,
    p_priority task_priority DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE(count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT COUNT(*)::BIGINT
    FROM tasks t
    WHERE t.user_id = p_user_id
      AND (p_status IS NULL OR t.status = p_status)
      AND (p_priority IS NULL OR t.priority = p_priority)
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_search IS NULL OR 
           t.title ILIKE '%' || p_search || '%' OR 
           t.description ILIKE '%' || p_search || '%');
END;
$$;

-- Función para obtener tareas paginadas con filtros
DROP FUNCTION IF EXISTS get_user_tasks_paginated(UUID, task_status, task_priority, UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_user_tasks_paginated(
    p_user_id UUID,
    p_status task_status DEFAULT NULL,
    p_priority task_priority DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    project_id UUID,
    title VARCHAR,
    description TEXT,
    status task_status,
    priority task_priority,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    IF p_sort_by = 'title' THEN
        RETURN QUERY
        SELECT t.*
        FROM tasks t
        WHERE t.user_id = p_user_id
          AND (p_status IS NULL OR t.status = p_status)
          AND (p_priority IS NULL OR t.priority = p_priority)
          AND (p_project_id IS NULL OR t.project_id = p_project_id)
          AND (p_search IS NULL OR 
               t.title ILIKE '%' || p_search || '%' OR 
               t.description ILIKE '%' || p_search || '%')
        ORDER BY t.title, t.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
        
    ELSIF p_sort_by = 'due_date' THEN
        RETURN QUERY
        SELECT t.*
        FROM tasks t
        WHERE t.user_id = p_user_id
          AND (p_status IS NULL OR t.status = p_status)
          AND (p_priority IS NULL OR t.priority = p_priority)
          AND (p_project_id IS NULL OR t.project_id = p_project_id)
          AND (p_search IS NULL OR 
               t.title ILIKE '%' || p_search || '%' OR 
               t.description ILIKE '%' || p_search || '%')
        ORDER BY t.due_date NULLS LAST, t.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
        
    ELSIF p_sort_by = 'priority' THEN
        RETURN QUERY
        SELECT t.*
        FROM tasks t
        WHERE t.user_id = p_user_id
          AND (p_status IS NULL OR t.status = p_status)
          AND (p_priority IS NULL OR t.priority = p_priority)
          AND (p_project_id IS NULL OR t.project_id = p_project_id)
          AND (p_search IS NULL OR 
               t.title ILIKE '%' || p_search || '%' OR 
               t.description ILIKE '%' || p_search || '%')
        ORDER BY 
            CASE t.priority
                WHEN 'high' THEN 1
                WHEN 'med' THEN 2
                WHEN 'low' THEN 3
            END,
            t.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
        
    ELSE
        RETURN QUERY
        SELECT t.*
        FROM tasks t
        WHERE t.user_id = p_user_id
          AND (p_status IS NULL OR t.status = p_status)
          AND (p_priority IS NULL OR t.priority = p_priority)
          AND (p_project_id IS NULL OR t.project_id = p_project_id)
          AND (p_search IS NULL OR 
               t.title ILIKE '%' || p_search || '%' OR 
               t.description ILIKE '%' || p_search || '%')
        ORDER BY t.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$;

-- Leer tarea específica
DROP FUNCTION IF EXISTS get_task(UUID, UUID);
CREATE FUNCTION get_task(
    p_user_id UUID,
    p_task_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    project_id UUID,
    title VARCHAR,
    description TEXT,
    status task_status,
    priority task_priority,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT t.id, t.user_id, t.project_id, t.title, t.description, 
           t.status, t.priority, t.due_date, t.created_at, t.updated_at
    FROM tasks t
    WHERE t.id = p_task_id AND t.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Actualizar tarea
DROP FUNCTION IF EXISTS update_task(UUID, UUID, UUID, VARCHAR, TEXT, task_status, task_priority, TIMESTAMP);
CREATE FUNCTION update_task(
    p_user_id UUID,
    p_task_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_title VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_status task_status DEFAULT NULL,
    p_priority task_priority DEFAULT NULL,
    p_due_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    UPDATE tasks
    SET 
        project_id = COALESCE(p_project_id, project_id),
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        status = COALESCE(p_status, status),
        priority = COALESCE(p_priority, priority),
        due_date = COALESCE(p_due_date, due_date)
    WHERE id = p_task_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Eliminar tarea
DROP FUNCTION IF EXISTS delete_task(UUID, UUID);
CREATE FUNCTION delete_task(
    p_user_id UUID,
    p_task_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    DELETE FROM tasks
    WHERE id = p_task_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIONES PARA TAGS

-- 🔹 Primero eliminamos las funciones si existen
DROP FUNCTION IF EXISTS create_tag(UUID, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_user_tags(UUID);
DROP FUNCTION IF EXISTS update_tag(UUID, UUID, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS delete_tag(UUID, UUID);

-- Crear tag
CREATE OR REPLACE FUNCTION create_tag(
    p_user_id UUID,
    p_normalized_name VARCHAR,
    p_display_name VARCHAR DEFAULT NULL,
    p_color VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    INSERT INTO tags (user_id, normalized_name, display_name, color)
    VALUES (p_user_id, p_normalized_name, COALESCE(p_display_name, p_normalized_name), p_color)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Leer tags de usuario
CREATE OR REPLACE FUNCTION get_user_tags(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    normalized_name VARCHAR,
    display_name VARCHAR,
    color VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    RETURN QUERY
    SELECT t.id, t.user_id, t.normalized_name, t.display_name, t.color, t.created_at
    FROM tags t
    WHERE t.user_id = p_user_id
    ORDER BY t.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Actualizar tag
CREATE OR REPLACE FUNCTION update_tag(
    p_user_id UUID,
    p_tag_id UUID,
    p_display_name VARCHAR DEFAULT NULL,
    p_color VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);

    UPDATE tags
    SET 
        display_name = COALESCE(p_display_name, display_name),
        color = COALESCE(p_color, color)
    WHERE id = p_tag_id AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Eliminar tag
CREATE OR REPLACE FUNCTION delete_tag(
    p_user_id UUID,
    p_tag_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    DELETE FROM tags
    WHERE id = p_tag_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIONES PARA TASK_TAGS

-- 🔹 Primero eliminamos las funciones si existen
DROP FUNCTION IF EXISTS add_tag_to_task(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS remove_tag_from_task(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS get_task_tags(UUID, UUID);
DROP FUNCTION IF EXISTS get_tasks_by_tag(UUID, UUID);

-- Añadir tag a tarea
CREATE OR REPLACE FUNCTION add_tag_to_task(
    p_user_id UUID,
    p_task_id UUID,
    p_tag_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    -- Verificar que tanto la tarea como el tag pertenecen al usuario
    IF EXISTS (
        SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = p_user_id
    ) AND EXISTS (
        SELECT 1 FROM tags WHERE id = p_tag_id AND user_id = p_user_id
    ) THEN
        INSERT INTO task_tags (task_id, tag_id)
        VALUES (p_task_id, p_tag_id)
        ON CONFLICT (task_id, tag_id) DO NOTHING;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover tag de tarea
CREATE OR REPLACE FUNCTION remove_tag_from_task(
    p_user_id UUID,
    p_task_id UUID,
    p_tag_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    DELETE FROM task_tags
    WHERE task_id = p_task_id AND tag_id = p_tag_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_task_tags(
    p_user_id UUID,
    p_task_id UUID
)
RETURNS TABLE (
    tag_id UUID,
    normalized_name VARCHAR,
    display_name VARCHAR,
    color VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);

    RETURN QUERY
    SELECT tg.id AS tag_id,
           tg.normalized_name,
           tg.display_name,
           tg.color,
           tt.created_at
    FROM task_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    WHERE tt.task_id = p_task_id AND tg.user_id = p_user_id
    ORDER BY tg.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_tasks_by_tag(
    p_user_id UUID,
    p_tag_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    project_id UUID,
    title VARCHAR,
    description TEXT,
    status task_status,
    priority task_priority,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, false);

    RETURN QUERY
    SELECT t.id,
           t.user_id,
           t.project_id,
           t.title,
           t.description,
           t.status,
           t.priority,
           t.due_date,
           t.created_at,
           t.updated_at
    FROM tasks t
    JOIN task_tags tt ON t.id = tt.task_id
    WHERE tt.tag_id = p_tag_id AND t.user_id = p_user_id
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Otorgar permisos para ejecutar las funciones
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO todo_app_user;