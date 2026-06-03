-- ==============================================================================
-- HOTFIX: Sistema de Créditos DanceFit
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ==============================================================================

-- 1. Agregar saldo de créditos al perfil del cliente
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 2. Agregar método de pago a reservas ('yape' | 'credits')
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'yape';

-- ==============================================================================
-- FIN DEL HOTFIX
-- Después de ejecutar esto:
--   - Cada perfil tendrá un saldo de créditos (inicia en 0).
--   - Las reservas nuevas guardarán si se pagó con Yape o con créditos.
-- ==============================================================================
