-- Líneas de pedido sin SKU de catálogo (extensión, unión, fabricar, etc.).
-- En DBeaver, sobre mantec-erp: Alt+X. Idempotente.
-- El ciclo sigue en tbl_91 (mismo pedido, misma recepción). No es otra cabecera.

ALTER TABLE public.tbl_91_pedido_detalle
    ALTER COLUMN cod_insumo_91 DROP NOT NULL;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS descripcion_libre_91 VARCHAR(200);

ALTER TABLE public.tbl_91_pedido_detalle
    DROP CONSTRAINT IF EXISTS chk_91_sku_o_texto;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD CONSTRAINT chk_91_sku_o_texto CHECK (
        cod_insumo_91 IS NOT NULL
        OR TRIM(BOTH FROM COALESCE(descripcion_libre_91, '')) <> ''
    );

COMMENT ON COLUMN public.tbl_91_pedido_detalle.descripcion_libre_91 IS
    'Requerimiento sin código de tbl_89. Vacío si hay SKU.';
