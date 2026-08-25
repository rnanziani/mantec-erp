-- Módulo Pañol: tbl_48_d_herramienta / tbl_49_m_panol / tbl_50_d_panol
-- Ejecutar en PostgreSQL si las tablas aún no existen.

-- ============================================
-- TABLA 1: tbl_48_d_herramienta
-- ============================================

CREATE TABLE IF NOT EXISTS public.tbl_48_d_herramienta (
    idherramienta_48 serial4 NOT NULL,
    codigo_48 varchar(40) NOT NULL,
    nombre_48 varchar(120) NOT NULL,
    idmarca_insumo_48 int4 NULL,
    marca_48 varchar(80) NULL,
    modelo_48 varchar(80) NULL,
    serie_48 varchar(80) NULL,
    ubicacion_48 varchar(100) NULL,
    valor_48 numeric(12, 2) DEFAULT 0 NOT NULL,
    stock_48 int4 DEFAULT 1 NOT NULL,
    stock_disponible_48 int4 DEFAULT 1 NOT NULL,
    foto_48 text NULL,
    estado_48 varchar(20) DEFAULT 'DISPONIBLE' NOT NULL,
    activo_48 boolean DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_48_d_herramienta_pkey PRIMARY KEY (idherramienta_48),
    CONSTRAINT tbl_48_d_herramienta_codigo_uk UNIQUE (codigo_48),
    CONSTRAINT chk_tbl_48_codigo_no_vacio CHECK (TRIM(codigo_48) <> ''),
    CONSTRAINT chk_tbl_48_nombre_no_vacio CHECK (TRIM(nombre_48) <> ''),
    CONSTRAINT chk_tbl_48_valor_no_negativo CHECK (valor_48 >= 0),
    CONSTRAINT chk_tbl_48_stock_valido CHECK (stock_48 >= 0 AND stock_disponible_48 >= 0 AND stock_disponible_48 <= stock_48),
    CONSTRAINT chk_tbl_48_estado_valido CHECK (estado_48 IN ('DISPONIBLE', 'PRESTADA', 'EN_MANTENCION', 'PERDIDA', 'DANADA', 'DE_BAJA'))
);

-- ============================================
-- TABLA 2: tbl_49_m_panol (Maestro)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tbl_49_m_panol (
    idmpanol_49 serial4 NOT NULL,
    folio_49 varchar(20) NULL,
    tipomovimiento_49 varchar(20) NOT NULL,
    idtrabajador_49 int4 NOT NULL,
    idusuario_49 int4 NOT NULL,
    idresponsableentrega_49 int4 NULL,
    fecha_49 timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fechadevolucion_49 timestamp NULL,
    estado_49 varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
    observacion_49 text NULL,
    firmatrabajador_49 text NOT NULL,
    firmapanolero_49 text NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_49_m_panol_pkey PRIMARY KEY (idmpanol_49),
    CONSTRAINT chk_tbl_49_tipo_valido CHECK (tipomovimiento_49 IN ('SALIDA', 'DEVOLUCION')),
    CONSTRAINT chk_tbl_49_estado_valido CHECK (estado_49 IN ('PENDIENTE', 'COMPLETADA', 'ANULADA')),
    CONSTRAINT chk_tbl_49_fechas_validas CHECK (
        (fechadevolucion_49 IS NULL) OR
        (fechadevolucion_49 IS NOT NULL AND fechadevolucion_49 >= fecha_49)
    ),
    CONSTRAINT chk_tbl_49_firmas_no_vacias CHECK (
        TRIM(firmatrabajador_49) <> '' AND TRIM(firmapanolero_49) <> ''
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_tbl_49_folio ON public.tbl_49_m_panol (folio_49) WHERE folio_49 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_trabajador ON public.tbl_49_m_panol (idtrabajador_49);
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_usuario ON public.tbl_49_m_panol (idusuario_49);
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_responsable ON public.tbl_49_m_panol (idresponsableentrega_49);
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_fecha ON public.tbl_49_m_panol (fecha_49 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_estado ON public.tbl_49_m_panol (estado_49);
CREATE INDEX IF NOT EXISTS idx_tbl_49_panol_tipo ON public.tbl_49_m_panol (tipomovimiento_49);

-- ============================================
-- TABLA 3: tbl_50_d_panol (Detalle)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tbl_50_d_panol (
    iddpanol_50 serial4 NOT NULL,
    idmpanol_50 int4 NOT NULL,
    idherramienta_50 int4 NOT NULL,
    estadoentrega_50 varchar(20) DEFAULT 'BUENA' NOT NULL,
    estadodevolucion_50 varchar(20) NULL,
    cantidad_50 int4 DEFAULT 1 NOT NULL,
    observacion_50 text NULL,
    foto_50 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT tbl_50_d_panol_pkey PRIMARY KEY (iddpanol_50),
    CONSTRAINT chk_tbl_50_cantidad_positiva CHECK (cantidad_50 > 0),
    CONSTRAINT chk_tbl_50_estado_entrega_valido CHECK (estadoentrega_50 IN ('BUENA', 'REGULAR', 'DANADA')),
    CONSTRAINT chk_tbl_50_estado_devolucion_valido CHECK (estadodevolucion_50 IS NULL OR estadodevolucion_50 IN ('BUENA', 'REGULAR', 'DANADA', 'PERDIDA')),
    CONSTRAINT uq_tbl_50_d_panol_herramienta UNIQUE (idmpanol_50, idherramienta_50)
);

CREATE INDEX IF NOT EXISTS idx_tbl_50_panol_maestro ON public.tbl_50_d_panol (idmpanol_50);
CREATE INDEX IF NOT EXISTS idx_tbl_50_panol_herramienta ON public.tbl_50_d_panol (idherramienta_50);
CREATE INDEX IF NOT EXISTS idx_tbl_50_panol_estado_entrega ON public.tbl_50_d_panol (estadoentrega_50);
CREATE INDEX IF NOT EXISTS idx_tbl_50_panol_estado_devolucion ON public.tbl_50_d_panol (estadodevolucion_50);

-- ============================================
-- FOREIGN KEYS (idempotentes)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_48_marca') THEN
    ALTER TABLE public.tbl_48_d_herramienta
      ADD CONSTRAINT fk_tbl_48_marca
      FOREIGN KEY (idmarca_insumo_48)
      REFERENCES public.tbl_37_marca_insumo(id_marca_insumo_37)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_49_trabajador') THEN
    ALTER TABLE public.tbl_49_m_panol
      ADD CONSTRAINT fk_tbl_49_trabajador
      FOREIGN KEY (idtrabajador_49)
      REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_49_usuario') THEN
    ALTER TABLE public.tbl_49_m_panol
      ADD CONSTRAINT fk_tbl_49_usuario
      FOREIGN KEY (idusuario_49)
      REFERENCES public.tbl_00_usuario(id_usuario_00)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_49_responsable') THEN
    ALTER TABLE public.tbl_49_m_panol
      ADD CONSTRAINT fk_tbl_49_responsable
      FOREIGN KEY (idresponsableentrega_49)
      REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_50_maestro') THEN
    ALTER TABLE public.tbl_50_d_panol
      ADD CONSTRAINT fk_tbl_50_maestro
      FOREIGN KEY (idmpanol_50)
      REFERENCES public.tbl_49_m_panol(idmpanol_49)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_50_herramienta') THEN
    ALTER TABLE public.tbl_50_d_panol
      ADD CONSTRAINT fk_tbl_50_herramienta
      FOREIGN KEY (idherramienta_50)
      REFERENCES public.tbl_48_d_herramienta(idherramienta_48)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION fn_normalizar_herramienta_48()
RETURNS TRIGGER AS $$
BEGIN
    NEW.codigo_48 := UPPER(TRIM(NEW.codigo_48));
    NEW.nombre_48 := UPPER(TRIM(NEW.nombre_48));
    IF NEW.marca_48 IS NOT NULL THEN
        NEW.marca_48 := UPPER(TRIM(NEW.marca_48));
    END IF;
    IF NEW.modelo_48 IS NOT NULL THEN
        NEW.modelo_48 := UPPER(TRIM(NEW.modelo_48));
    END IF;
    IF NEW.serie_48 IS NOT NULL THEN
        NEW.serie_48 := UPPER(TRIM(NEW.serie_48));
    END IF;
    IF NEW.ubicacion_48 IS NOT NULL THEN
        NEW.ubicacion_48 := UPPER(TRIM(NEW.ubicacion_48));
    END IF;
    NEW.estado_48 := UPPER(TRIM(NEW.estado_48));
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_herramienta_48 ON public.tbl_48_d_herramienta;
CREATE TRIGGER trg_normalizar_herramienta_48
    BEFORE INSERT OR UPDATE ON public.tbl_48_d_herramienta
    FOR EACH ROW
    EXECUTE FUNCTION fn_normalizar_herramienta_48();

CREATE OR REPLACE FUNCTION fn_actualizar_panol_49()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tipomovimiento_49 := UPPER(TRIM(NEW.tipomovimiento_49));
    NEW.estado_49 := UPPER(TRIM(NEW.estado_49));
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_panol_49 ON public.tbl_49_m_panol;
CREATE TRIGGER trg_actualizar_panol_49
    BEFORE INSERT OR UPDATE ON public.tbl_49_m_panol
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_panol_49();

CREATE OR REPLACE FUNCTION fn_actualizar_detalle_panol_50()
RETURNS TRIGGER AS $$
BEGIN
    NEW.estadoentrega_50 := UPPER(TRIM(NEW.estadoentrega_50));
    IF NEW.estadodevolucion_50 IS NOT NULL THEN
        NEW.estadodevolucion_50 := UPPER(TRIM(NEW.estadodevolucion_50));
    END IF;
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_detalle_panol_50 ON public.tbl_50_d_panol;
CREATE TRIGGER trg_actualizar_detalle_panol_50
    BEFORE INSERT OR UPDATE ON public.tbl_50_d_panol
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_detalle_panol_50();

CREATE OR REPLACE FUNCTION fn_generar_folio_panol_49()
RETURNS TRIGGER AS $$
DECLARE
    v_prefijo varchar(10);
    v_anio varchar(4);
    v_consecutivo int4;
    v_folio varchar(20);
BEGIN
    IF NEW.folio_49 IS NULL OR TRIM(NEW.folio_49) = '' THEN
        v_prefijo := CASE NEW.tipomovimiento_49
            WHEN 'SALIDA' THEN 'SAL'
            WHEN 'DEVOLUCION' THEN 'DEV'
            ELSE 'PAN'
        END;
        v_anio := EXTRACT(YEAR FROM NEW.fecha_49)::varchar;

        SELECT COALESCE(MAX(CAST(SPLIT_PART(folio_49, '-', 3) AS int4)), 0) + 1
        INTO v_consecutivo
        FROM tbl_49_m_panol
        WHERE folio_49 LIKE v_prefijo || '-' || v_anio || '-%';

        v_folio := v_prefijo || '-' || v_anio || '-' || LPAD(v_consecutivo::varchar, 4, '0');
        NEW.folio_49 := v_folio;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_panol_49 ON public.tbl_49_m_panol;
CREATE TRIGGER trg_generar_folio_panol_49
    BEFORE INSERT ON public.tbl_49_m_panol
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_panol_49();

CREATE OR REPLACE FUNCTION fn_gestionar_panol_48()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_movimiento varchar(20);
    v_estado_movimiento varchar(20);
BEGIN
    SELECT UPPER(TRIM(tipomovimiento_49)), UPPER(TRIM(estado_49))
    INTO v_tipo_movimiento, v_estado_movimiento
    FROM tbl_49_m_panol
    WHERE idmpanol_49 = NEW.idmpanol_50;

    -- Préstamo firmado: aplica en PENDIENTE o COMPLETADA
    IF v_tipo_movimiento = 'SALIDA'
       AND v_estado_movimiento IN ('PENDIENTE', 'COMPLETADA') THEN
        UPDATE tbl_48_d_herramienta
        SET
            stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
            estado_48 = CASE
                WHEN (stock_disponible_48 - NEW.cantidad_50) <= 0 THEN 'PRESTADA'
                ELSE estado_48
            END,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE idherramienta_48 = NEW.idherramienta_50;
    END IF;

    -- Devolución: solo cuando el movimiento está COMPLETADA
    IF v_tipo_movimiento = 'DEVOLUCION'
       AND v_estado_movimiento = 'COMPLETADA'
       AND NEW.estadodevolucion_50 IS NOT NULL THEN
        IF NEW.estadodevolucion_50 IN ('BUENA', 'REGULAR') THEN
            UPDATE tbl_48_d_herramienta
            SET
                stock_disponible_48 = LEAST(stock_48, stock_disponible_48 + NEW.cantidad_50),
                estado_48 = CASE
                    WHEN stock_disponible_48 + NEW.cantidad_50 > 0 THEN 'DISPONIBLE'
                    ELSE estado_48
                END,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        END IF;

        IF NEW.estadodevolucion_50 = 'PERDIDA' THEN
            UPDATE tbl_48_d_herramienta
            SET
                estado_48 = 'PERDIDA',
                stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        ELSIF NEW.estadodevolucion_50 = 'DANADA' THEN
            UPDATE tbl_48_d_herramienta
            SET
                estado_48 = 'DANADA',
                stock_disponible_48 = GREATEST(0, stock_disponible_48 - NEW.cantidad_50),
                actualizado_en = CURRENT_TIMESTAMP
            WHERE idherramienta_48 = NEW.idherramienta_50;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gestionar_panol_48 ON public.tbl_50_d_panol;
CREATE TRIGGER trg_gestionar_panol_48
    AFTER INSERT OR UPDATE ON public.tbl_50_d_panol
    FOR EACH ROW
    EXECUTE FUNCTION fn_gestionar_panol_48();

CREATE OR REPLACE VIEW v_herramientas_prestadas AS
SELECT
    h.idherramienta_48,
    h.codigo_48,
    h.nombre_48,
    h.valor_48,
    t.nombre_06 || ' ' || t.apaterno_06 || ' ' || t.amaterno_06 AS trabajador,
    m.folio_49,
    m.fecha_49 AS fecha_salida,
    d.estadoentrega_50 AS estado_entrega
FROM tbl_48_d_herramienta h
JOIN tbl_50_d_panol d ON h.idherramienta_48 = d.idherramienta_50
JOIN tbl_49_m_panol m ON d.idmpanol_50 = m.idmpanol_49
JOIN tbl_06_trabajador t ON m.idtrabajador_49 = t.idtrabajador_06
WHERE h.estado_48 = 'PRESTADA'
AND m.tipomovimiento_49 = 'SALIDA'
AND m.estado_49 IN ('PENDIENTE', 'COMPLETADA')
ORDER BY m.fecha_49 DESC;
