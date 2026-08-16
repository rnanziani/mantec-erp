-- Renombra estados de detalle EPP y migra datos existentes.
-- Ejecutar en local y producción.

ALTER TABLE public.tbl_55_d_entrega_epp
  DROP CONSTRAINT IF EXISTS chk_tbl_55_estado_entrega_valido;

UPDATE public.tbl_55_d_entrega_epp
SET estadoentrega_55 = CASE upper(estadoentrega_55)
  WHEN 'BUENA' THEN 'BUENO/A'
  WHEN 'REGULAR' THEN 'USADO/A'
  WHEN 'DANADA' THEN 'DAÑADO/A'
  WHEN 'DAÑADA' THEN 'DAÑADO/A'
  WHEN 'NUEVO/A' THEN 'NUEVO/A'
  ELSE estadoentrega_55
END;

ALTER TABLE public.tbl_55_d_entrega_epp
  ALTER COLUMN estadoentrega_55 SET DEFAULT 'BUENO/A';

ALTER TABLE public.tbl_55_d_entrega_epp
  ADD CONSTRAINT chk_tbl_55_estado_entrega_valido
  CHECK (estadoentrega_55 IN ('NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A'));
