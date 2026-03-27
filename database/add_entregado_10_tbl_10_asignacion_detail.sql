-- Agrega estado de entrega por línea de detalle de asignación de prendas.
-- true  = prenda entregada (mostrar como verdadero en UI)
-- false = pendiente (mostrar como falso en UI)

ALTER TABLE public.tbl_10_asignacion_detail
ADD COLUMN IF NOT EXISTS entregado_10 boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tbl_10_asignacion_detail.entregado_10 IS 'Indica si la prenda ya fue entregada al trabajador.';
