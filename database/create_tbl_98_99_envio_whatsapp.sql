-- Lotes de WhatsApp por pedido (09:30 vs 11:30 al mismo proveedor).
-- En DBeaver, sobre mantec-erp: Alt+X. Idempotente.
-- Una línea de tbl_91 entra en un solo lote. Deshacer el lote la vuelve a pendiente.

CREATE TABLE IF NOT EXISTS public.tbl_98_pedido_envio_wa (
    id_envio_98 SERIAL PRIMARY KEY,
    id_pedido_98 INT NOT NULL,
    proveedor_98 VARCHAR(150) NOT NULL,
    id_proveedor_98 INT,
    telefono_98 VARCHAR(20),
    texto_98 TEXT,
    usuario_98 VARCHAR(50),
    fecha_envio_98 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_98_pedido FOREIGN KEY (id_pedido_98)
        REFERENCES public.tbl_92_pedido_cabecera(id_pedido_92) ON DELETE CASCADE,
    CONSTRAINT fk_98_proveedor FOREIGN KEY (id_proveedor_98)
        REFERENCES public.tbl_90_proveedor(id_proveedor_90)
);

CREATE TABLE IF NOT EXISTS public.tbl_99_pedido_envio_wa_det (
    id_envio_det_99 SERIAL PRIMARY KEY,
    id_envio_99 INT NOT NULL,
    id_detalle_99 INT NOT NULL,
    CONSTRAINT fk_99_envio FOREIGN KEY (id_envio_99)
        REFERENCES public.tbl_98_pedido_envio_wa(id_envio_98) ON DELETE CASCADE,
    CONSTRAINT fk_99_detalle FOREIGN KEY (id_detalle_99)
        REFERENCES public.tbl_91_pedido_detalle(id_detalle_91) ON DELETE CASCADE,
    CONSTRAINT uq_99_detalle UNIQUE (id_detalle_99)
);

CREATE INDEX IF NOT EXISTS idx_98_pedido ON public.tbl_98_pedido_envio_wa(id_pedido_98);
CREATE INDEX IF NOT EXISTS idx_99_envio ON public.tbl_99_pedido_envio_wa_det(id_envio_99);

COMMENT ON TABLE public.tbl_98_pedido_envio_wa IS
    'Lote de WhatsApp: un envío a un proveedor en un momento. No es otra cabecera de pedido.';
COMMENT ON TABLE public.tbl_99_pedido_envio_wa_det IS
    'Líneas de tbl_91 incluidas en ese lote. UNIQUE: no se reenvían.';
