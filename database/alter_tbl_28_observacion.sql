-- Observación por movimiento (tbl_28). No reemplaza observacion_19 del maestro.
-- Ejecutar en local y Render (Alt+X).

ALTER TABLE public.tbl_28_transaccion
  ADD COLUMN IF NOT EXISTS observacion_28 varchar(250) NULL;

COMMENT ON COLUMN public.tbl_28_transaccion.observacion_28 IS
  'Nota del movimiento: prueba, marca distinta u observación operativa';
