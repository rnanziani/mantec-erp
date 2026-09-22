-- Render / DBeaver: seleccione todo y Alt+X. Sin DO $$.
-- 1) Asegura cantidad_86 (no-op si ya corrió alter_tbl_86_cantidad.sql).
-- 2) Corrige EXP-2026-0005: juego de 2 unidades, folio ya instalado (no reabre el ciclo).

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD COLUMN IF NOT EXISTS cantidad_86 int4 DEFAULT 1 NOT NULL;

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_cantidad;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_cantidad CHECK (cantidad_86 >= 1);

UPDATE public.tbl_86_expediente_repuesto
SET cantidad_86 = 2
WHERE folio_86 = 'EXP-2026-0005';

SELECT folio_86, estado_86, origen_alta_86, cantidad_86, valor_reparacion_86
FROM public.tbl_86_expediente_repuesto
WHERE folio_86 = 'EXP-2026-0005';
