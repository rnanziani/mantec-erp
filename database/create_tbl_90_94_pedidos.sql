-- Módulo Pedidos (tbl_90 proveedor, 92 cabecera, 91 detalle, 93 recepción, 94 historial).
-- Ejecutar en DBeaver sobre producción (Alt+X). No duplica tbl_58 (proveedores de reparación).

-- 1. Proveedores de pedido
CREATE TABLE IF NOT EXISTS public.tbl_90_proveedor (
    id_proveedor_90 SERIAL PRIMARY KEY,
    razon_social_90 VARCHAR(150) NOT NULL,
    ruc_90 VARCHAR(20) UNIQUE,
    tipo_despacho_90 VARCHAR(20) DEFAULT 'Despacha'
        CHECK (tipo_despacho_90 IN ('Despacha', 'No despacha', 'Mixto')),
    contacto_90 VARCHAR(100),
    telefono_90 VARCHAR(20),
    activo_90 BOOLEAN DEFAULT TRUE,
    fecha_registro_90 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cabecera
CREATE TABLE IF NOT EXISTS public.tbl_92_pedido_cabecera (
    id_pedido_92 SERIAL PRIMARY KEY,
    id_proveedor_92 INT NOT NULL,
    id_responsable_92 INT NOT NULL,
    numero_orden_92 VARCHAR(50) UNIQUE,
    fecha_pedido_92 DATE NOT NULL DEFAULT CURRENT_DATE,
    estado_pago_92 VARCHAR(20) DEFAULT 'Pendiente'
        CHECK (estado_pago_92 IN ('Pendiente', 'Pagado', 'Parcial', 'Anulado')),
    estado_recepcion_92 VARCHAR(20) DEFAULT 'Pendiente'
        CHECK (estado_recepcion_92 IN ('Pendiente', 'Recibido', 'Parcial', 'No retirado', 'Anulado')),
    fecha_pago_92 DATE,
    fecha_retiro_92 DATE,
    observaciones_cab_92 TEXT,
    usuario_creacion_92 VARCHAR(50),
    fecha_creacion_92 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_92_proveedor FOREIGN KEY (id_proveedor_92)
        REFERENCES public.tbl_90_proveedor(id_proveedor_90),
    CONSTRAINT fk_92_responsable FOREIGN KEY (id_responsable_92)
        REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
);

-- 3. Detalle (SKU = tbl_89 etiquetas)
CREATE TABLE IF NOT EXISTS public.tbl_91_pedido_detalle (
    id_detalle_91 SERIAL PRIMARY KEY,
    id_pedido_91 INT NOT NULL,
    cod_insumo_91 INT NOT NULL,
    cantidad_solicitada_91 NUMERIC(12,4) NOT NULL CHECK (cantidad_solicitada_91 > 0),
    cantidad_recibida_91 NUMERIC(12,4) DEFAULT 0 CHECK (cantidad_recibida_91 >= 0),
    precio_unitario_91 NUMERIC(12,4),
    subtotal_91 NUMERIC(12,4) GENERATED ALWAYS AS
        (cantidad_solicitada_91 * COALESCE(precio_unitario_91, 0)) STORED,
    observaciones_det_91 TEXT,
    CONSTRAINT fk_91_cabecera FOREIGN KEY (id_pedido_91)
        REFERENCES public.tbl_92_pedido_cabecera(id_pedido_92) ON DELETE CASCADE,
    CONSTRAINT fk_91_insumo FOREIGN KEY (cod_insumo_91)
        REFERENCES public.tbl_89_codigo_etiqueta(idcodigo_89),
    CONSTRAINT chk_91_cantidades CHECK (cantidad_recibida_91 <= cantidad_solicitada_91)
);

-- 4. Recepciones parciales
CREATE TABLE IF NOT EXISTS public.tbl_93_recepcion_parcial (
    id_recepcion_93 SERIAL PRIMARY KEY,
    id_detalle_93 INT NOT NULL,
    fecha_recepcion_93 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cantidad_recibida_93 NUMERIC(12,4) NOT NULL CHECK (cantidad_recibida_93 > 0),
    id_responsable_recibe_93 INT NOT NULL,
    observaciones_rec_93 TEXT,
    CONSTRAINT fk_93_detalle FOREIGN KEY (id_detalle_93)
        REFERENCES public.tbl_91_pedido_detalle(id_detalle_91) ON DELETE CASCADE,
    CONSTRAINT fk_93_responsable FOREIGN KEY (id_responsable_recibe_93)
        REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
);

-- 5. Historial de estados (lo llena el trigger; no hay CRUD)
CREATE TABLE IF NOT EXISTS public.tbl_94_historial_estado_pedido (
    id_historial_94 SERIAL PRIMARY KEY,
    id_pedido_94 INT NOT NULL,
    campo_modificado_94 VARCHAR(50) NOT NULL,
    valor_anterior_94 VARCHAR(50),
    valor_nuevo_94 VARCHAR(50),
    usuario_modifico_94 VARCHAR(50) DEFAULT current_user,
    fecha_modificacion_94 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_94_cabecera FOREIGN KEY (id_pedido_94)
        REFERENCES public.tbl_92_pedido_cabecera(id_pedido_92) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_92_proveedor ON public.tbl_92_pedido_cabecera(id_proveedor_92);
CREATE INDEX IF NOT EXISTS idx_92_fecha ON public.tbl_92_pedido_cabecera(fecha_pedido_92);
CREATE INDEX IF NOT EXISTS idx_92_estado_pago ON public.tbl_92_pedido_cabecera(estado_pago_92);
CREATE INDEX IF NOT EXISTS idx_92_estado_recepcion ON public.tbl_92_pedido_cabecera(estado_recepcion_92);
CREATE INDEX IF NOT EXISTS idx_91_pedido ON public.tbl_91_pedido_detalle(id_pedido_91);
CREATE INDEX IF NOT EXISTS idx_91_insumo ON public.tbl_91_pedido_detalle(cod_insumo_91);

CREATE OR REPLACE FUNCTION public.fn_audit_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_pago_92 IS DISTINCT FROM OLD.estado_pago_92 THEN
        INSERT INTO public.tbl_94_historial_estado_pedido
            (id_pedido_94, campo_modificado_94, valor_anterior_94, valor_nuevo_94)
        VALUES (NEW.id_pedido_92, 'estado_pago_92', OLD.estado_pago_92, NEW.estado_pago_92);
    END IF;
    IF NEW.estado_recepcion_92 IS DISTINCT FROM OLD.estado_recepcion_92 THEN
        INSERT INTO public.tbl_94_historial_estado_pedido
            (id_pedido_94, campo_modificado_94, valor_anterior_94, valor_nuevo_94)
        VALUES (NEW.id_pedido_92, 'estado_recepcion_92', OLD.estado_recepcion_92, NEW.estado_recepcion_92);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_estado_pedido ON public.tbl_92_pedido_cabecera;
CREATE TRIGGER trg_audit_estado_pedido
AFTER UPDATE ON public.tbl_92_pedido_cabecera
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_estado_pedido();

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
