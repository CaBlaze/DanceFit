-- ==============================================================================
-- HOTFIX: Agrega columnas "instructor" y "role" a la tabla classes
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
--
-- PROBLEMA: El formulario de admin envía "instructor" (texto libre) pero
-- la tabla classes solo tenía "instructor_id" (FK a instructors).
-- Supabase rechazaba el INSERT con: "Could not find 'instructor' column".
--
-- SOLUCIÓN: Añadir las columnas de texto como fallback. El sistema sigue
-- soportando instructor_id para las clases creadas desde SQL/semillas,
-- y usará el texto libre para clases creadas desde el panel admin.
-- ==============================================================================

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS instructor TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role       TEXT NOT NULL DEFAULT '';

-- Rellenar las clases semilla existentes con el nombre del instructor desde la FK
UPDATE public.classes c
SET
    instructor = COALESCE(i.name, ''),
    role       = COALESCE(i.role, '')
FROM public.instructors i
WHERE c.instructor_id = i.id
  AND c.instructor = '';   -- solo actualiza las que están vacías

-- ==============================================================================
-- FIN DEL HOTFIX
-- Después de ejecutar esto, la creación de clases desde el panel admin
-- funcionará correctamente sin necesidad de seleccionar un instructor_id.
-- ==============================================================================
