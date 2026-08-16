-- Amplía estados de detalle EPP: NUEVO/A
-- Ejecutar en local y en producción (Render) si la tabla ya existe.

ALTER TABLE public.tbl_55_d_entrega_epp
  DROP CONSTRAINT IF EXISTS chk_tbl_55_estado_entrega_valido;

ALTER TABLE public.tbl_55_d_entrega_epp
  ADD CONSTRAINT chk_tbl_55_estado_entrega_valido
  CHECK (estadoentrega_55 IN ('NUEVO/A', 'BUENA', 'REGULAR', 'DANADA'));
