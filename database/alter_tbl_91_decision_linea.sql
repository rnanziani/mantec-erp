-- Estado del insumo al cerrar la línea (combo Resto). No es un catálogo:
-- cada código tiene una acción distinta en el cierre.
-- En DBeaver, sobre la base de pedidos: Alt+X. Idempotente.

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS decision_linea_91 VARCHAR(20);

ALTER TABLE public.tbl_91_pedido_detalle
    DROP CONSTRAINT IF EXISTS chk_91_decision;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD CONSTRAINT chk_91_decision CHECK (
        decision_linea_91 IS NULL
        OR decision_linea_91 IN (
            'mas_1', 'mas_2', 'mas_3', 'bodega', 'recepcionado',
            're_solicitar', 'retirar', 'cancelar', 'traslado'
        )
    );

COMMENT ON COLUMN public.tbl_91_pedido_detalle.decision_linea_91 IS
    'mas_1/2/3 pasa a N días; traslado pasa el pendiente a una fecha elegida; recepcionado cierra en bodega sin marcar pago; bodega cierra pagado y en bodega; re_solicitar y retirar dejan la línea abierta; cancelar no vuelve a pedir.';
