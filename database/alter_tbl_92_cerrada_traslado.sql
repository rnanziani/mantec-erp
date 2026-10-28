-- Cerrar recepción: estado Cerrada + rastro de línea trasladada al pedido consolidado.
-- En DBeaver, sobre mantec-erp: Alt+X. Idempotente.

ALTER TABLE public.tbl_92_pedido_cabecera
    DROP CONSTRAINT IF EXISTS tbl_92_pedido_cabecera_estado_recepcion_92_check;

ALTER TABLE public.tbl_92_pedido_cabecera
    ADD CONSTRAINT tbl_92_pedido_cabecera_estado_recepcion_92_check
    CHECK (estado_recepcion_92 IN (
        'Pendiente', 'Recibido', 'Parcial', 'No retirado', 'Anulado', 'Cerrada'
    ));

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS id_detalle_origen_91 INT;

DO $$
BEGIN
    ALTER TABLE public.tbl_91_pedido_detalle
        ADD CONSTRAINT fk_91_origen
        FOREIGN KEY (id_detalle_origen_91)
        REFERENCES public.tbl_91_pedido_detalle(id_detalle_91);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_91_origen ON public.tbl_91_pedido_detalle(id_detalle_origen_91);

COMMENT ON COLUMN public.tbl_91_pedido_detalle.id_detalle_origen_91 IS
    'Línea de un pedido anterior desde la que se copió el pendiente. No mueve el documento original.';

CREATE OR REPLACE VIEW public.v_verificador_pedidos AS
SELECT
    c.id_pedido_92,
    c.numero_orden_92,
    c.fecha_pedido_92,
    p.razon_social_90 AS proveedor,
    p.tipo_despacho_90,
    r.nombreresponsableentrega_08 AS responsable_genero,
    c.estado_pago_92,
    c.estado_recepcion_92,
    SUM(d.cantidad_solicitada_91) AS total_items_solicitados,
    SUM(d.cantidad_recibida_91) AS total_items_recibidos,
    CASE
        WHEN c.estado_recepcion_92 = 'No retirado' THEN 'NO RETIRADO'
        WHEN c.estado_recepcion_92 = 'Cerrada' THEN 'CERRADA'
        WHEN c.estado_recepcion_92 = 'Anulado' THEN 'ANULADO'
        WHEN SUM(d.cantidad_recibida_91) = 0 THEN 'PENDIENTE DE RETIRO'
        WHEN SUM(d.cantidad_recibida_91) < SUM(d.cantidad_solicitada_91) THEN 'INCOMPLETO'
        ELSE 'COMPLETO'
    END AS estado_global_pedido,
    CASE
        WHEN c.estado_pago_92 = 'Pagado'
             AND c.estado_recepcion_92 IN ('Pendiente', 'No retirado')
        THEN 'PAGADO Y NO RETIRADO'
        ELSE NULL
    END AS alerta_critica,
    ROUND(
        (SUM(d.cantidad_recibida_91)::numeric / NULLIF(SUM(d.cantidad_solicitada_91), 0)) * 100
    , 2) AS pct_cumplimiento
FROM public.tbl_92_pedido_cabecera c
JOIN public.tbl_90_proveedor p ON c.id_proveedor_92 = p.id_proveedor_90
JOIN public.tbl_08_responsable_entrega r ON c.id_responsable_92 = r.idresponsableentrega_08
JOIN public.tbl_91_pedido_detalle d ON c.id_pedido_92 = d.id_pedido_91
GROUP BY
    c.id_pedido_92, c.numero_orden_92, c.fecha_pedido_92,
    p.razon_social_90, p.tipo_despacho_90, r.nombreresponsableentrega_08,
    c.estado_pago_92, c.estado_recepcion_92;
