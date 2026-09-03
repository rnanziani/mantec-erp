-- Valor de reparación cobrado por el proveedor (por línea de entrega etapa 2)
-- Se conoce al devolver el repuesto reparado, no en recepción dañado (etapa 1).

ALTER TABLE public.tbl_64_d_entrega_repuesto
  ADD COLUMN IF NOT EXISTS valor_reparacion_64 numeric(12, 2) DEFAULT 0 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tbl_64_valor_reparacion_no_negativo'
  ) THEN
    ALTER TABLE public.tbl_64_d_entrega_repuesto
      ADD CONSTRAINT chk_tbl_64_valor_reparacion_no_negativo
      CHECK (valor_reparacion_64 >= 0);
  END IF;
END $$;
