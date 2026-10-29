-- Cierre por insumo: lo recibido, lo que pasa a mañana y lo que ya no se pide acá.
-- El PDF sigue usando cantidad_solicitada_91 (el pedido de ese día no se reescribe).
-- En DBeaver, sobre la base de pedidos: Alt+X. Idempotente, salvo el vaciado final.

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS cantidad_pasada_91 NUMERIC(12,4) NOT NULL DEFAULT 0;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS cantidad_baja_91 NUMERIC(12,4) NOT NULL DEFAULT 0;

ALTER TABLE public.tbl_91_pedido_detalle
    DROP CONSTRAINT IF EXISTS chk_91_cierre;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD CONSTRAINT chk_91_cierre CHECK (
        cantidad_pasada_91 >= 0
        AND cantidad_baja_91 >= 0
        AND cantidad_recibida_91 + cantidad_pasada_91 + cantidad_baja_91 <= cantidad_solicitada_91
    );

COMMENT ON COLUMN public.tbl_91_pedido_detalle.cantidad_pasada_91 IS
    'Pendiente copiado al pedido del día siguiente. No cambia lo solicitado en el PDF.';

COMMENT ON COLUMN public.tbl_91_pedido_detalle.cantidad_baja_91 IS
    'Pendiente que ya no se pide por el sistema (compra externa o ya no hace falta).';
