-- Alta de stock reparado previo al sistema (juego en bodega, sin acta de envío).
-- DBeaver: seleccione todo y Alt+X. Sin DO $$. Idempotente.

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD COLUMN IF NOT EXISTS origen_alta_86 varchar(20) DEFAULT 'CICLO' NOT NULL;

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_origen_alta;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_origen_alta CHECK (
    origen_alta_86 IN ('CICLO', 'STOCK_PREVIO')
  );

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_stock_previo_estado;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_stock_previo_estado CHECK (
    origen_alta_86 <> 'STOCK_PREVIO'
    OR estado_86 IN ('PROVEEDOR_A_BODEGA', 'BODEGA_A_MAQUINA')
  );

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_entrega;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_entrega CHECK (
    estado_86 = 'MAQUINA_A_BODEGA'
    OR origen_alta_86 = 'STOCK_PREVIO'
    OR (idproveedor_86 IS NOT NULL AND fecha_entrega_proveedor_86 IS NOT NULL)
  );
