-- Cantidad de unidades del mismo tipo en un viaje (juego que no se separa).
-- DBeaver: seleccione todo y Alt+X. Sin DO $$. Idempotente.

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD COLUMN IF NOT EXISTS cantidad_86 int4 DEFAULT 1 NOT NULL;

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_cantidad;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_cantidad CHECK (cantidad_86 >= 1);

COMMENT ON COLUMN public.tbl_86_expediente_repuesto.cantidad_86 IS
  'Unidades de este tipo en el mismo viaje. Si se separan, otro folio.';
