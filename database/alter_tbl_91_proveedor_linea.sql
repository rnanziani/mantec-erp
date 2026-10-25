-- Proveedor de cada línea (sobre todo insumos sin SKU: FERRUCONSTRU, LA HERRAMIENTA).
-- En DBeaver, sobre mantec-erp: Alt+X. Idempotente.
-- La cabecera (tbl_92) sigue siendo a quién se emite el pedido; esto es de dónde sale el ítem.

ALTER TABLE public.tbl_91_pedido_detalle
    ADD COLUMN IF NOT EXISTS id_proveedor_91 INT;

ALTER TABLE public.tbl_91_pedido_detalle
    DROP CONSTRAINT IF EXISTS fk_91_proveedor;

ALTER TABLE public.tbl_91_pedido_detalle
    ADD CONSTRAINT fk_91_proveedor FOREIGN KEY (id_proveedor_91)
        REFERENCES public.tbl_90_proveedor(id_proveedor_90);

CREATE INDEX IF NOT EXISTS idx_91_proveedor ON public.tbl_91_pedido_detalle(id_proveedor_91);

COMMENT ON COLUMN public.tbl_91_pedido_detalle.id_proveedor_91 IS
    'Proveedor de la línea (tbl_90). Obligatorio si no hay SKU; en catálogo puede ir vacío y se muestra tbl_89.';
