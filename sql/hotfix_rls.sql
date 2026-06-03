-- ==============================================================================
-- HOTFIX: Corrige "infinite recursion detected in policy for relation profiles"
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- Solo toca las políticas RLS que causan el problema.
-- No borra datos ni tablas.
-- ==============================================================================

-- PASO 1: Crear función helper is_admin() con SECURITY DEFINER
-- Esta función bypasea el RLS al ejecutarse, eliminando la recursión.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;


-- PASO 2: Eliminar las políticas problemáticas (las que consultan profiles desde profiles)

-- Políticas de profiles
DROP POLICY IF EXISTS "profiles_all_admin"                                   ON public.profiles;
DROP POLICY IF EXISTS "Permitir que los administradores editen cualquier perfil" ON public.profiles;

-- Políticas de instructors
DROP POLICY IF EXISTS "instructors_all_admin"                                ON public.instructors;
DROP POLICY IF EXISTS "Permitir gestión de instructores solo a administradores" ON public.instructors;

-- Políticas de classes
DROP POLICY IF EXISTS "classes_all_admin"                                    ON public.classes;
DROP POLICY IF EXISTS "Permitir escritura completa solo a administradores"   ON public.classes;

-- Políticas de reservations
DROP POLICY IF EXISTS "reservations_all_admin"                               ON public.reservations;
DROP POLICY IF EXISTS "Permitir que los administradores vean todas las reservas"    ON public.reservations;
DROP POLICY IF EXISTS "Permitir que los administradores modifiquen cualquier reserva" ON public.reservations;


-- PASO 3: Recrear las políticas usando public.is_admin() (sin recursión)

CREATE POLICY "profiles_all_admin"
    ON public.profiles FOR ALL
    USING (public.is_admin());

CREATE POLICY "instructors_all_admin"
    ON public.instructors FOR ALL
    USING (public.is_admin());

CREATE POLICY "classes_all_admin"
    ON public.classes FOR ALL
    USING (public.is_admin());

CREATE POLICY "reservations_all_admin"
    ON public.reservations FOR ALL
    USING (public.is_admin());


-- ==============================================================================
-- FIN DEL HOTFIX
-- Después de ejecutar esto, recarga la app en el navegador.
-- ==============================================================================
