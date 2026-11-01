-- Una caja puede traer más unidades que las pedidas (10 brocas, llegan 12).
-- Lo solicitado del PDF no cambia. Lo recibido sí puede superarlo.
-- El sobrante de una línea no cubre el pendiente de otra.
-- En DBeaver, sobre la base de pedidos: Alt+X. Idempotente.

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.tbl_91_pedido_detalle'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%cantidad_recibida_91%'
          AND pg_get_constraintdef(oid) ILIKE '%cantidad_solicitada_91%'
    LOOP
        EXECUTE format('ALTER TABLE public.tbl_91_pedido_detalle DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE public.tbl_91_pedido_detalle
    DROP CONSTRAINT IF EXISTS chk_91_cierre;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD CONSTRAINT chk_91_cierre CHECK (
        cantidad_pasada_91 >= 0
        AND cantidad_baja_91 >= 0
        AND cantidad_pasada_91 + cantidad_baja_91
            <= cantidad_solicitada_91 - LEAST(COALESCE(cantidad_recibida_91, 0), cantidad_solicitada_91)
    );
