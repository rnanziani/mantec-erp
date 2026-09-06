-- Balanceo en cabecera de trazabilidad (tbl_76)
-- DBeaver: Alt+X. Local y Render.

ALTER TABLE public.tbl_76_m_trazabilidad_neumatico
  ADD COLUMN IF NOT EXISTS balanceo_76 boolean NOT NULL DEFAULT false;
