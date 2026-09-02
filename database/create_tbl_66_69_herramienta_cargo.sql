-- ============================================
-- Herramientas a cargo (asignación permanente)
-- tbl_66 catálogo
-- tbl_67 maestro entrega
-- tbl_68 detalle entrega
-- tbl_69 devoluciones (parcial o total por línea)
-- ============================================

-- 1) Catálogo
CREATE TABLE IF NOT EXISTS public.tbl_66_herramienta_cargo (
    idherramienta_66 serial4 NOT NULL,
    codigo_66 varchar(40) NOT NULL,
    nombre_66 varchar(120) NOT NULL,
    idmarca_insumo_66 int4 NULL,
    modelo_66 varchar(80) NULL,
    serie_66 varchar(80) NULL,
    ubicacion_66 varchar(100) NULL,
    valor_66 numeric(12, 2) DEFAULT 0 NOT NULL,
    stock_66 int4 DEFAULT 1 NOT NULL,
    stock_disponible_66 int4 DEFAULT 1 NOT NULL,
    foto_66 text NULL,
    estado_66 varchar(20) DEFAULT 'DISPONIBLE' NOT NULL,
    activo_66 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_66_herramienta_cargo PRIMARY KEY (idherramienta_66),
    CONSTRAINT uk_tbl_66_codigo UNIQUE (codigo_66),
    CONSTRAINT chk_tbl_66_codigo_no_vacio CHECK (TRIM(BOTH FROM codigo_66) <> ''),
    CONSTRAINT chk_tbl_66_nombre_no_vacio CHECK (TRIM(BOTH FROM nombre_66) <> ''),
    CONSTRAINT chk_tbl_66_stock_valido CHECK (
        stock_66 >= 0 AND stock_disponible_66 >= 0 AND stock_disponible_66 <= stock_66
    ),
    CONSTRAINT chk_tbl_66_valor_no_negativo CHECK (valor_66 >= 0),
    CONSTRAINT chk_tbl_66_estado_valido CHECK (
        estado_66 IN ('DISPONIBLE', 'A_CARGO', 'EN_MANTENCION', 'PERDIDA', 'DANADA', 'DE_BAJA')
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_66_activo ON public.tbl_66_herramienta_cargo (activo_66);
CREATE INDEX IF NOT EXISTS idx_tbl_66_estado ON public.tbl_66_herramienta_cargo (estado_66);
CREATE INDEX IF NOT EXISTS idx_tbl_66_nombre ON public.tbl_66_herramienta_cargo (nombre_66);

-- 2) Maestro entrega
CREATE TABLE IF NOT EXISTS public.tbl_67_m_entrega_cargo (
    identrega_67 serial4 NOT NULL,
    folio_67 varchar(30) NULL,
    idtrabajador_67 int4 NOT NULL,
    idresponsable_67 int4 NOT NULL,
    idccosto_67 int4 NOT NULL,
    fecha_67 date DEFAULT CURRENT_DATE NOT NULL,
    hora_67 time DEFAULT CURRENT_TIME NOT NULL,
    estado_67 varchar(20) DEFAULT 'ACTIVA' NOT NULL,
    observacion_67 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_67_m_entrega_cargo PRIMARY KEY (identrega_67),
    CONSTRAINT uk_tbl_67_folio UNIQUE (folio_67),
    CONSTRAINT chk_tbl_67_estado CHECK (
        estado_67 IN ('ACTIVA', 'PARCIAL', 'DEVUELTA', 'ANULADA')
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_67_trabajador ON public.tbl_67_m_entrega_cargo (idtrabajador_67);
CREATE INDEX IF NOT EXISTS idx_tbl_67_fecha ON public.tbl_67_m_entrega_cargo (fecha_67 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_67_estado ON public.tbl_67_m_entrega_cargo (estado_67);
CREATE INDEX IF NOT EXISTS idx_tbl_67_ccosto ON public.tbl_67_m_entrega_cargo (idccosto_67);

-- 3) Detalle entrega
CREATE TABLE IF NOT EXISTS public.tbl_68_d_entrega_cargo (
    iddetalle_68 serial4 NOT NULL,
    identrega_68 int4 NOT NULL,
    idherramienta_68 int4 NOT NULL,
    cantidad_68 int4 DEFAULT 1 NOT NULL,
    cantidad_devuelta_68 int4 DEFAULT 0 NOT NULL,
    estado_entrega_68 varchar(20) DEFAULT 'BUENA' NOT NULL,
    observacion_68 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_68_d_entrega_cargo PRIMARY KEY (iddetalle_68),
    CONSTRAINT uk_tbl_68_entrega_herramienta UNIQUE (identrega_68, idherramienta_68),
    CONSTRAINT chk_tbl_68_cantidad_positiva CHECK (cantidad_68 > 0),
    CONSTRAINT chk_tbl_68_devuelta CHECK (
        cantidad_devuelta_68 >= 0 AND cantidad_devuelta_68 <= cantidad_68
    ),
    CONSTRAINT chk_tbl_68_estado_entrega CHECK (
        estado_entrega_68 IN ('BUENA', 'REGULAR', 'DANADA')
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_68_entrega ON public.tbl_68_d_entrega_cargo (identrega_68);
CREATE INDEX IF NOT EXISTS idx_tbl_68_herramienta ON public.tbl_68_d_entrega_cargo (idherramienta_68);

-- 4) Devoluciones (parcial o total por línea)
CREATE TABLE IF NOT EXISTS public.tbl_69_devolucion_cargo (
    iddevolucion_69 serial4 NOT NULL,
    iddetalle_69 int4 NOT NULL,
    cantidad_69 int4 DEFAULT 1 NOT NULL,
    fecha_69 date DEFAULT CURRENT_DATE NOT NULL,
    hora_69 time DEFAULT CURRENT_TIME NOT NULL,
    estado_herramienta_69 varchar(20) NOT NULL,
    idresponsable_69 int4 NULL,
    observacion_69 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_69_devolucion_cargo PRIMARY KEY (iddevolucion_69),
    CONSTRAINT chk_tbl_69_cantidad_positiva CHECK (cantidad_69 > 0),
    CONSTRAINT chk_tbl_69_estado CHECK (
        estado_herramienta_69 IN ('BUENA', 'REGULAR', 'DANADA', 'PERDIDA')
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_69_detalle ON public.tbl_69_devolucion_cargo (iddetalle_69);
CREATE INDEX IF NOT EXISTS idx_tbl_69_fecha ON public.tbl_69_devolucion_cargo (fecha_69 DESC);

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_66_marca') THEN
    ALTER TABLE public.tbl_66_herramienta_cargo
      ADD CONSTRAINT fk_tbl_66_marca
      FOREIGN KEY (idmarca_insumo_66) REFERENCES public.tbl_37_marca_insumo(id_marca_insumo_37)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_67_trabajador') THEN
    ALTER TABLE public.tbl_67_m_entrega_cargo
      ADD CONSTRAINT fk_tbl_67_trabajador
      FOREIGN KEY (idtrabajador_67) REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_67_responsable') THEN
    ALTER TABLE public.tbl_67_m_entrega_cargo
      ADD CONSTRAINT fk_tbl_67_responsable
      FOREIGN KEY (idresponsable_67) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_67_ccosto') THEN
    ALTER TABLE public.tbl_67_m_entrega_cargo
      ADD CONSTRAINT fk_tbl_67_ccosto
      FOREIGN KEY (idccosto_67) REFERENCES public.tbl_45_ccosto(id_ccosto_45)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_68_maestro') THEN
    ALTER TABLE public.tbl_68_d_entrega_cargo
      ADD CONSTRAINT fk_tbl_68_maestro
      FOREIGN KEY (identrega_68) REFERENCES public.tbl_67_m_entrega_cargo(identrega_67)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_68_herramienta') THEN
    ALTER TABLE public.tbl_68_d_entrega_cargo
      ADD CONSTRAINT fk_tbl_68_herramienta
      FOREIGN KEY (idherramienta_68) REFERENCES public.tbl_66_herramienta_cargo(idherramienta_66)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_69_detalle') THEN
    ALTER TABLE public.tbl_69_devolucion_cargo
      ADD CONSTRAINT fk_tbl_69_detalle
      FOREIGN KEY (iddetalle_69) REFERENCES public.tbl_68_d_entrega_cargo(iddetalle_68)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_69_responsable') THEN
    ALTER TABLE public.tbl_69_devolucion_cargo
      ADD CONSTRAINT fk_tbl_69_responsable
      FOREIGN KEY (idresponsable_69) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Folio HTC-YYYY-NNNN
CREATE OR REPLACE FUNCTION fn_generar_folio_entrega_cargo_67()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_67 IS NULL OR TRIM(NEW.folio_67) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_67, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_67 ~ ('^HTC-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_67, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_67_m_entrega_cargo;

        NEW.folio_67 := 'HTC-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_entrega_cargo_67 ON public.tbl_67_m_entrega_cargo;
CREATE TRIGGER trg_generar_folio_entrega_cargo_67
    BEFORE INSERT ON public.tbl_67_m_entrega_cargo
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_entrega_cargo_67();
