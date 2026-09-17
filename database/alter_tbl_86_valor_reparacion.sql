-- Valor cobrado por el proveedor al devolver el repuesto (Proveedor → Bodega).
-- NULL = aún no volvió. 0 = garantía / sin cobro.
-- DBeaver: seleccione todo y Alt+X (script). No use Ctrl+Enter.
-- Sin DO $$ para que el ; interno no corte el bloque.

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD COLUMN IF NOT EXISTS valor_reparacion_86 numeric(12, 2) NULL;

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_valor_reparacion;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_valor_reparacion
  CHECK (valor_reparacion_86 IS NULL OR valor_reparacion_86 >= 0);

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_valor_en_vuelta;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_valor_en_vuelta CHECK (
    estado_86 NOT IN ('PROVEEDOR_A_BODEGA', 'BODEGA_A_MAQUINA')
    OR valor_reparacion_86 IS NOT NULL
  );
