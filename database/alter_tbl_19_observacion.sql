-- Observación en el maestro de alternadores (pruebas, marca distinta, prototipo).
-- Ejecutar en local y Render (Alt+X). GitHub no aplica el ALTER.

ALTER TABLE public.tbl_19_alternador
  ADD COLUMN IF NOT EXISTS observacion_19 varchar(250) NULL;

COMMENT ON COLUMN public.tbl_19_alternador.observacion_19 IS
  'Nota de prueba, marca distinta u observación del componente';
