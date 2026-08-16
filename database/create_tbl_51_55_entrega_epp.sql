-- ============================================
-- MÓDULO DE REGISTRO DE ENTREGA DE EPP
-- Versión Final (Sin firmas digitales)
-- Tablas: tbl_51 … tbl_55
-- ============================================

BEGIN;

-- TABLA 1: tbl_51_tipo_elemento
CREATE TABLE IF NOT EXISTS public.tbl_51_tipo_elemento (
    idtipo_elemento_51 serial4 NOT NULL,
    tipo_elemento_51 varchar(100) NOT NULL,
    descripcion_51 text NULL,
    activo_51 boolean DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_51_tipo_elemento_pkey PRIMARY KEY (idtipo_elemento_51),
    CONSTRAINT uk_tbl_51_tipo_elemento UNIQUE (tipo_elemento_51),
    CONSTRAINT chk_tbl_51_tipo_no_vacio CHECK (TRIM(tipo_elemento_51) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_51_tipo_activo ON public.tbl_51_tipo_elemento (activo_51);

-- TABLA 2: tbl_52_categoria_elemento
CREATE TABLE IF NOT EXISTS public.tbl_52_categoria_elemento (
    idcategoria_elemento_52 serial4 NOT NULL,
    idtipo_elemento_52 int4 NOT NULL,
    categoria_52 varchar(100) NOT NULL,
    descripcion_52 text NULL,
    activo_52 boolean DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_52_categoria_elemento_pkey PRIMARY KEY (idcategoria_elemento_52),
    CONSTRAINT uk_tbl_52_categoria UNIQUE (idtipo_elemento_52, categoria_52),
    CONSTRAINT chk_tbl_52_categoria_no_vacia CHECK (TRIM(categoria_52) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_52_categoria_tipo ON public.tbl_52_categoria_elemento (idtipo_elemento_52);
CREATE INDEX IF NOT EXISTS idx_tbl_52_categoria_activo ON public.tbl_52_categoria_elemento (activo_52);

-- TABLA 3: tbl_53_elemento
CREATE TABLE IF NOT EXISTS public.tbl_53_elemento (
    idelemento_53 serial4 NOT NULL,
    codigo_53 varchar(50) NOT NULL,
    nombre_53 varchar(150) NOT NULL,
    idcategoria_53 int4 NOT NULL,
    idtipo_elemento_53 int4 NOT NULL,
    idmarca_53 int4 NULL,
    descripcion_53 text NULL,
    unidad_medida_53 varchar(20) DEFAULT 'UNIDAD' NOT NULL,
    stock_actual_53 int4 DEFAULT 0 NOT NULL,
    stock_minimo_53 int4 DEFAULT 5 NOT NULL,
    valor_unitario_53 numeric(12, 2) DEFAULT 0 NULL,
    activo_53 boolean DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_53_elemento_pkey PRIMARY KEY (idelemento_53),
    CONSTRAINT uk_tbl_53_codigo UNIQUE (codigo_53),
    CONSTRAINT chk_tbl_53_codigo_no_vacio CHECK (TRIM(codigo_53) <> ''),
    CONSTRAINT chk_tbl_53_nombre_no_vacio CHECK (TRIM(nombre_53) <> ''),
    CONSTRAINT chk_tbl_53_stock_valido CHECK (stock_actual_53 >= 0 AND stock_minimo_53 >= 0),
    CONSTRAINT chk_tbl_53_valor_no_negativo CHECK (valor_unitario_53 IS NULL OR valor_unitario_53 >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tbl_53_elemento_categoria ON public.tbl_53_elemento (idcategoria_53);
CREATE INDEX IF NOT EXISTS idx_tbl_53_elemento_tipo ON public.tbl_53_elemento (idtipo_elemento_53);
CREATE INDEX IF NOT EXISTS idx_tbl_53_elemento_marca ON public.tbl_53_elemento (idmarca_53);
CREATE INDEX IF NOT EXISTS idx_tbl_53_elemento_activo ON public.tbl_53_elemento (activo_53);
CREATE INDEX IF NOT EXISTS idx_tbl_53_elemento_nombre ON public.tbl_53_elemento (LOWER(nombre_53));

-- TABLA 4: tbl_54_m_entrega_epp (SIN FIRMAS)
CREATE TABLE IF NOT EXISTS public.tbl_54_m_entrega_epp (
    identregaepp_54 serial4 NOT NULL,
    folio_54 varchar(30) NULL,
    idtrabajador_54 int4 NOT NULL,
    idclase_54 int4 NULL,
    idccosto_54 int4 NULL,
    idempresa_54 int4 NOT NULL,
    idcargo_54 int4 NOT NULL,
    idresponsableentrega_54 int4 NULL,
    fecha_entrega_54 date NOT NULL,
    hora_entrega_54 time DEFAULT CURRENT_TIME NOT NULL,
    lugar_entrega_54 varchar(100) NULL,
    motivo_entrega_54 varchar(50) DEFAULT 'DOTACION INICIAL' NOT NULL,
    nombre_responsable_54 varchar(150) NULL,
    rut_responsable_54 varchar(12) NULL,
    observaciones_54 text NULL,
    estado_54 varchar(20) DEFAULT 'ENTREGADO' NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_54_m_entrega_epp_pkey PRIMARY KEY (identregaepp_54),
    CONSTRAINT chk_tbl_54_motivo_valido CHECK (motivo_entrega_54 IN ('DOTACION INICIAL', 'REPOSICION', 'RENUEVO', 'PRIMERA VEZ', 'CAMBIO DE CARGO')),
    CONSTRAINT chk_tbl_54_estado_valido CHECK (estado_54 IN ('ENTREGADO', 'ANULADO', 'PENDIENTE_FIRMA'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_tbl_54_folio ON public.tbl_54_m_entrega_epp (folio_54) WHERE folio_54 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_trabajador ON public.tbl_54_m_entrega_epp (idtrabajador_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_clase ON public.tbl_54_m_entrega_epp (idclase_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_ccosto ON public.tbl_54_m_entrega_epp (idccosto_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_empresa ON public.tbl_54_m_entrega_epp (idempresa_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_cargo ON public.tbl_54_m_entrega_epp (idcargo_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_responsable ON public.tbl_54_m_entrega_epp (idresponsableentrega_54);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_fecha ON public.tbl_54_m_entrega_epp (fecha_entrega_54 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_54_entrega_estado ON public.tbl_54_m_entrega_epp (estado_54);

-- TABLA 5: tbl_55_d_entrega_epp
CREATE TABLE IF NOT EXISTS public.tbl_55_d_entrega_epp (
    iddetalleentrega_55 serial4 NOT NULL,
    identregaepp_55 int4 NOT NULL,
    idelemento_55 int4 NOT NULL,
    idtalla_55 int4 NULL,
    idmarca_55 int4 NULL,
    cantidad_55 int4 NOT NULL DEFAULT 1,
    valor_unitario_55 numeric(12, 2) DEFAULT 0 NULL,
    estadoentrega_55 varchar(20) DEFAULT 'BUENO/A' NOT NULL,
    observacion_55 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_55_d_entrega_epp_pkey PRIMARY KEY (iddetalleentrega_55),
    CONSTRAINT chk_tbl_55_cantidad_positiva CHECK (cantidad_55 > 0),
    CONSTRAINT chk_tbl_55_estado_entrega_valido CHECK (estadoentrega_55 IN ('NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A')),
    CONSTRAINT chk_tbl_55_valor_no_negativo CHECK (valor_unitario_55 IS NULL OR valor_unitario_55 >= 0),
    CONSTRAINT uq_tbl_55_detalle UNIQUE (identregaepp_55, idelemento_55)
);

CREATE INDEX IF NOT EXISTS idx_tbl_55_detalle_maestro ON public.tbl_55_d_entrega_epp (identregaepp_55);
CREATE INDEX IF NOT EXISTS idx_tbl_55_detalle_elemento ON public.tbl_55_d_entrega_epp (idelemento_55);
CREATE INDEX IF NOT EXISTS idx_tbl_55_detalle_talla ON public.tbl_55_d_entrega_epp (idtalla_55);
CREATE INDEX IF NOT EXISTS idx_tbl_55_detalle_marca ON public.tbl_55_d_entrega_epp (idmarca_55);
CREATE INDEX IF NOT EXISTS idx_tbl_55_detalle_estado ON public.tbl_55_d_entrega_epp (estadoentrega_55);

-- FOREIGN KEYS
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_52_tipo') THEN
    ALTER TABLE public.tbl_52_categoria_elemento ADD CONSTRAINT fk_tbl_52_tipo
    FOREIGN KEY (idtipo_elemento_52) REFERENCES public.tbl_51_tipo_elemento(idtipo_elemento_51) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_53_categoria') THEN
    ALTER TABLE public.tbl_53_elemento ADD CONSTRAINT fk_tbl_53_categoria
    FOREIGN KEY (idcategoria_53) REFERENCES public.tbl_52_categoria_elemento(idcategoria_elemento_52) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_53_tipo') THEN
    ALTER TABLE public.tbl_53_elemento ADD CONSTRAINT fk_tbl_53_tipo
    FOREIGN KEY (idtipo_elemento_53) REFERENCES public.tbl_51_tipo_elemento(idtipo_elemento_51) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_53_marca') THEN
    ALTER TABLE public.tbl_53_elemento ADD CONSTRAINT fk_tbl_53_marca
    FOREIGN KEY (idmarca_53) REFERENCES public.tbl_37_marca_insumo(id_marca_insumo_37) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_trabajador') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_trabajador
    FOREIGN KEY (idtrabajador_54) REFERENCES public.tbl_06_trabajador(idtrabajador_06) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_clase') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_clase
    FOREIGN KEY (idclase_54) REFERENCES public.tbl_56_clase_elemento(idclase_56) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_ccosto') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_ccosto
    FOREIGN KEY (idccosto_54) REFERENCES public.tbl_45_ccosto(id_ccosto_45) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_empresa') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_empresa
    FOREIGN KEY (idempresa_54) REFERENCES public.tbl_15_empresas(idempresa_15) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_cargo') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_cargo
    FOREIGN KEY (idcargo_54) REFERENCES public.tbl_14_cargo(idcargo_14) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_54_responsable') THEN
    ALTER TABLE public.tbl_54_m_entrega_epp ADD CONSTRAINT fk_tbl_54_responsable
    FOREIGN KEY (idresponsableentrega_54) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_55_maestro') THEN
    ALTER TABLE public.tbl_55_d_entrega_epp ADD CONSTRAINT fk_tbl_55_maestro
    FOREIGN KEY (identregaepp_55) REFERENCES public.tbl_54_m_entrega_epp(identregaepp_54) ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_55_elemento') THEN
    ALTER TABLE public.tbl_55_d_entrega_epp ADD CONSTRAINT fk_tbl_55_elemento
    FOREIGN KEY (idelemento_55) REFERENCES public.tbl_53_elemento(idelemento_53) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_55_talla') THEN
    ALTER TABLE public.tbl_55_d_entrega_epp ADD CONSTRAINT fk_tbl_55_talla
    FOREIGN KEY (idtalla_55) REFERENCES public.tbl_16_tallas(id_16) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_55_marca') THEN
    ALTER TABLE public.tbl_55_d_entrega_epp ADD CONSTRAINT fk_tbl_55_marca
    FOREIGN KEY (idmarca_55) REFERENCES public.tbl_37_marca_insumo(id_marca_insumo_37) ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

-- TRIGGERS / VISTAS (normalización, folio, stock)
CREATE OR REPLACE FUNCTION fn_normalizar_tipo_elemento_51() RETURNS TRIGGER AS $$
BEGIN
    NEW.tipo_elemento_51 := UPPER(TRIM(NEW.tipo_elemento_51));
    IF NEW.descripcion_51 IS NOT NULL THEN NEW.descripcion_51 := UPPER(TRIM(NEW.descripcion_51)); END IF;
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_tipo_elemento_51 ON public.tbl_51_tipo_elemento;
CREATE TRIGGER trg_normalizar_tipo_elemento_51 BEFORE INSERT OR UPDATE ON public.tbl_51_tipo_elemento
    FOR EACH ROW EXECUTE FUNCTION fn_normalizar_tipo_elemento_51();

CREATE OR REPLACE FUNCTION fn_normalizar_categoria_52() RETURNS TRIGGER AS $$
BEGIN
    NEW.categoria_52 := UPPER(TRIM(NEW.categoria_52));
    IF NEW.descripcion_52 IS NOT NULL THEN NEW.descripcion_52 := UPPER(TRIM(NEW.descripcion_52)); END IF;
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_categoria_52 ON public.tbl_52_categoria_elemento;
CREATE TRIGGER trg_normalizar_categoria_52 BEFORE INSERT OR UPDATE ON public.tbl_52_categoria_elemento
    FOR EACH ROW EXECUTE FUNCTION fn_normalizar_categoria_52();

CREATE OR REPLACE FUNCTION fn_normalizar_elemento_53() RETURNS TRIGGER AS $$
BEGIN
    NEW.codigo_53 := UPPER(TRIM(NEW.codigo_53));
    NEW.nombre_53 := UPPER(TRIM(NEW.nombre_53));
    IF NEW.descripcion_53 IS NOT NULL THEN NEW.descripcion_53 := UPPER(TRIM(NEW.descripcion_53)); END IF;
    NEW.unidad_medida_53 := UPPER(TRIM(NEW.unidad_medida_53));
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_elemento_53 ON public.tbl_53_elemento;
CREATE TRIGGER trg_normalizar_elemento_53 BEFORE INSERT OR UPDATE ON public.tbl_53_elemento
    FOR EACH ROW EXECUTE FUNCTION fn_normalizar_elemento_53();

CREATE OR REPLACE FUNCTION fn_actualizar_entrega_epp_54() RETURNS TRIGGER AS $$
BEGIN
    NEW.motivo_entrega_54 := UPPER(TRIM(NEW.motivo_entrega_54));
    NEW.estado_54 := UPPER(TRIM(NEW.estado_54));
    IF NEW.lugar_entrega_54 IS NOT NULL THEN NEW.lugar_entrega_54 := UPPER(TRIM(NEW.lugar_entrega_54)); END IF;
    IF NEW.nombre_responsable_54 IS NOT NULL THEN NEW.nombre_responsable_54 := UPPER(TRIM(NEW.nombre_responsable_54)); END IF;
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_entrega_epp_54 ON public.tbl_54_m_entrega_epp;
CREATE TRIGGER trg_actualizar_entrega_epp_54 BEFORE INSERT OR UPDATE ON public.tbl_54_m_entrega_epp
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_entrega_epp_54();

CREATE OR REPLACE FUNCTION fn_generar_folio_epp_54() RETURNS TRIGGER AS $$
DECLARE
    v_anio varchar(4);
    v_consecutivo int4;
    v_folio varchar(30);
BEGIN
    IF NEW.folio_54 IS NULL OR TRIM(NEW.folio_54) = '' THEN
        v_anio := EXTRACT(YEAR FROM NEW.fecha_entrega_54)::varchar;
        SELECT COALESCE(MAX(CAST(SPLIT_PART(folio_54, '-', 3) AS int4)), 0) + 1 INTO v_consecutivo
        FROM tbl_54_m_entrega_epp WHERE folio_54 LIKE 'EPP-' || v_anio || '-%';
        v_folio := 'EPP-' || v_anio || '-' || LPAD(v_consecutivo::varchar, 4, '0');
        NEW.folio_54 := v_folio;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_epp_54 ON public.tbl_54_m_entrega_epp;
CREATE TRIGGER trg_generar_folio_epp_54 BEFORE INSERT ON public.tbl_54_m_entrega_epp
    FOR EACH ROW EXECUTE FUNCTION fn_generar_folio_epp_54();

CREATE OR REPLACE FUNCTION fn_actualizar_detalle_epp_55() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.observacion_55 IS NOT NULL THEN NEW.observacion_55 := UPPER(TRIM(NEW.observacion_55)); END IF;
    NEW.estadoentrega_55 := UPPER(TRIM(NEW.estadoentrega_55));
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_detalle_epp_55 ON public.tbl_55_d_entrega_epp;
CREATE TRIGGER trg_actualizar_detalle_epp_55 BEFORE INSERT OR UPDATE ON public.tbl_55_d_entrega_epp
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_detalle_epp_55();

CREATE OR REPLACE FUNCTION fn_gestionar_stock_epp_53() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tbl_53_elemento SET stock_actual_53 = GREATEST(0, stock_actual_53 - NEW.cantidad_55), actualizado_en = CURRENT_TIMESTAMP
        WHERE idelemento_53 = NEW.idelemento_55;
    END IF;
    IF TG_OP = 'DELETE' THEN
        UPDATE tbl_53_elemento SET stock_actual_53 = stock_actual_53 + OLD.cantidad_55, actualizado_en = CURRENT_TIMESTAMP
        WHERE idelemento_53 = OLD.idelemento_55;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.cantidad_55 <> OLD.cantidad_55 THEN
        UPDATE tbl_53_elemento SET stock_actual_53 = GREATEST(0, stock_actual_53 + OLD.cantidad_55 - NEW.cantidad_55), actualizado_en = CURRENT_TIMESTAMP
        WHERE idelemento_53 = NEW.idelemento_55;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gestionar_stock_epp_53 ON public.tbl_55_d_entrega_epp;
CREATE TRIGGER trg_gestionar_stock_epp_53 AFTER INSERT OR UPDATE OR DELETE ON public.tbl_55_d_entrega_epp
    FOR EACH ROW EXECUTE FUNCTION fn_gestionar_stock_epp_53();

CREATE OR REPLACE VIEW v_entregas_epp_trabajador AS
SELECT
    m.identregaepp_54, m.folio_54, m.fecha_entrega_54, m.hora_entrega_54,
    t.ruttrabajador_06,
    t.nombre_06 || ' ' || t.apaterno_06 || ' ' || COALESCE(t.amaterno_06, '') AS trabajador_nombre,
    c.ccosto_45 AS centro_costo,
    emp.nombreempresa_15 AS empresa,
    car.cargo_14 AS cargo,
    m.motivo_entrega_54, m.estado_54,
    COUNT(d.iddetalleentrega_55) AS cantidad_elementos
FROM tbl_54_m_entrega_epp m
JOIN tbl_06_trabajador t ON m.idtrabajador_54 = t.idtrabajador_06
LEFT JOIN tbl_45_ccosto c ON m.idccosto_54 = c.id_ccosto_45
LEFT JOIN tbl_15_empresas emp ON m.idempresa_54 = emp.idempresa_15
LEFT JOIN tbl_14_cargo car ON m.idcargo_54 = car.idcargo_14
LEFT JOIN tbl_55_d_entrega_epp d ON m.identregaepp_54 = d.identregaepp_55
WHERE m.estado_54 = 'ENTREGADO'
GROUP BY m.identregaepp_54, m.folio_54, m.fecha_entrega_54, m.hora_entrega_54,
         t.ruttrabajador_06, t.nombre_06, t.apaterno_06, t.amaterno_06,
         c.ccosto_45, emp.nombreempresa_15, car.cargo_14, m.motivo_entrega_54, m.estado_54
ORDER BY m.fecha_entrega_54 DESC;

CREATE OR REPLACE VIEW v_detalle_entrega_epp AS
SELECT
    m.folio_54, m.fecha_entrega_54, m.hora_entrega_54, m.lugar_entrega_54, m.motivo_entrega_54,
    t.ruttrabajador_06,
    t.nombre_06 || ' ' || t.apaterno_06 || ' ' || COALESCE(t.amaterno_06, '') AS trabajador_nombre,
    emp.nombreempresa_15 AS empresa,
    car.cargo_14 AS cargo,
    c.ccosto_45 AS centro_costo,
    d.iddetalleentrega_55,
    e.codigo_53 AS codigo_elemento,
    e.nombre_53 AS elemento,
    te.tipo_elemento_51 AS tipo,
    ce.categoria_52 AS categoria,
    mi.marca_insumo_37 AS marca,
    d.cantidad_55,
    e.unidad_medida_53,
    d.valor_unitario_55,
    d.estadoentrega_55,
    d.observacion_55,
    m.nombre_responsable_54,
    m.rut_responsable_54
FROM tbl_54_m_entrega_epp m
JOIN tbl_06_trabajador t ON m.idtrabajador_54 = t.idtrabajador_06
LEFT JOIN tbl_15_empresas emp ON m.idempresa_54 = emp.idempresa_15
LEFT JOIN tbl_14_cargo car ON m.idcargo_54 = car.idcargo_14
LEFT JOIN tbl_45_ccosto c ON m.idccosto_54 = c.id_ccosto_45
JOIN tbl_55_d_entrega_epp d ON m.identregaepp_54 = d.identregaepp_55
JOIN tbl_53_elemento e ON d.idelemento_55 = e.idelemento_53
JOIN tbl_51_tipo_elemento te ON e.idtipo_elemento_53 = te.idtipo_elemento_51
JOIN tbl_52_categoria_elemento ce ON e.idcategoria_53 = ce.idcategoria_elemento_52
LEFT JOIN tbl_37_marca_insumo mi ON COALESCE(d.idmarca_55, e.idmarca_53) = mi.id_marca_insumo_37
WHERE m.estado_54 = 'ENTREGADO'
ORDER BY m.fecha_entrega_54 DESC, d.iddetalleentrega_55;

CREATE OR REPLACE VIEW v_stock_epp_alerta AS
SELECT
    idelemento_53, codigo_53, nombre_53, stock_actual_53, stock_minimo_53, valor_unitario_53,
    CASE
        WHEN stock_actual_53 = 0 THEN 'SIN STOCK'
        WHEN stock_actual_53 <= stock_minimo_53 THEN 'STOCK BAJO'
        ELSE 'OK'
    END AS estado_stock
FROM tbl_53_elemento
WHERE activo_53 = true
ORDER BY
    CASE WHEN stock_actual_53 = 0 THEN 1 WHEN stock_actual_53 <= stock_minimo_53 THEN 2 ELSE 3 END,
    nombre_53;

SELECT 'OK Modulo EPP (sin firmas)' AS estado;
COMMIT;
