-- ============================================
-- Entrega de repuestos dañados a proveedor (etapa 2)
-- tbl_61 catálogo estado reparación
-- tbl_62 catálogo semáforo (días)
-- tbl_63 maestro entrega
-- tbl_64 detalle entrega (vínculo a línea recepción tbl_60)
-- ============================================

-- 1) Catálogo: estado de reparación
CREATE TABLE IF NOT EXISTS public.tbl_61_estado_reparacion (
    idestado_61 serial4 NOT NULL,
    codigo_61 varchar(40) NOT NULL,
    nombre_61 varchar(120) NOT NULL,
    activo_61 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_61_estado_reparacion PRIMARY KEY (idestado_61),
    CONSTRAINT chk_tbl_61_codigo_no_vacio CHECK (TRIM(BOTH FROM codigo_61) <> ''),
    CONSTRAINT chk_tbl_61_nombre_no_vacio CHECK (TRIM(BOTH FROM nombre_61) <> ''),
    CONSTRAINT uk_tbl_61_codigo UNIQUE (codigo_61)
);

CREATE INDEX IF NOT EXISTS idx_tbl_61_activo ON public.tbl_61_estado_reparacion (activo_61);

-- 2) Catálogo: semáforo por días
CREATE TABLE IF NOT EXISTS public.tbl_62_semaforo_entrega (
    idsemaforo_62 serial4 NOT NULL,
    nombre_62 varchar(60) NOT NULL,
    dias_desde_62 int4 NOT NULL,
    dias_hasta_62 int4 NULL,
    color_62 varchar(20) NOT NULL,
    activo_62 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_62_semaforo_entrega PRIMARY KEY (idsemaforo_62),
    CONSTRAINT chk_tbl_62_nombre_no_vacio CHECK (TRIM(BOTH FROM nombre_62) <> ''),
    CONSTRAINT chk_tbl_62_dias_desde CHECK (dias_desde_62 >= 0),
    CONSTRAINT chk_tbl_62_dias_rango CHECK (
        dias_hasta_62 IS NULL OR dias_hasta_62 >= dias_desde_62
    ),
    CONSTRAINT chk_tbl_62_color_no_vacio CHECK (TRIM(BOTH FROM color_62) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_62_activo ON public.tbl_62_semaforo_entrega (activo_62);
CREATE INDEX IF NOT EXISTS idx_tbl_62_rango ON public.tbl_62_semaforo_entrega (dias_desde_62, dias_hasta_62);

-- 3) Maestro: entrega a proveedor
CREATE TABLE IF NOT EXISTS public.tbl_63_m_entrega_repuesto (
    identrega_63 serial4 NOT NULL,
    folio_63 varchar(30) NULL,
    idresponsable_63 int4 NOT NULL,
    idproveedor_63 int4 NOT NULL,
    fecha_entrega_63 date DEFAULT CURRENT_DATE NOT NULL,
    hora_63 time DEFAULT CURRENT_TIME NOT NULL,
    observacion_63 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_63_m_entrega_repuesto PRIMARY KEY (identrega_63),
    CONSTRAINT uk_tbl_63_folio UNIQUE (folio_63)
);

CREATE INDEX IF NOT EXISTS idx_tbl_63_fecha ON public.tbl_63_m_entrega_repuesto (fecha_entrega_63 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_63_proveedor ON public.tbl_63_m_entrega_repuesto (idproveedor_63);
CREATE INDEX IF NOT EXISTS idx_tbl_63_responsable ON public.tbl_63_m_entrega_repuesto (idresponsable_63);

-- 4) Detalle: líneas vinculadas a recepción pendiente
CREATE TABLE IF NOT EXISTS public.tbl_64_d_entrega_repuesto (
    iddetalle_64 serial4 NOT NULL,
    identrega_64 int4 NOT NULL,
    iddetalle_recepcion_64 int4 NOT NULL,
    idestado_reparacion_64 int4 NOT NULL,
    fecha_recepcion_64 date NULL,
    observacion_64 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_64_d_entrega_repuesto PRIMARY KEY (iddetalle_64),
    CONSTRAINT uk_tbl_64_detalle_recepcion UNIQUE (iddetalle_recepcion_64),
    CONSTRAINT chk_tbl_64_fecha_recepcion CHECK (
        fecha_recepcion_64 IS NULL OR fecha_recepcion_64 >= DATE '1900-01-01'
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_64_entrega ON public.tbl_64_d_entrega_repuesto (identrega_64);
CREATE INDEX IF NOT EXISTS idx_tbl_64_estado ON public.tbl_64_d_entrega_repuesto (idestado_reparacion_64);
CREATE INDEX IF NOT EXISTS idx_tbl_64_fecha_recepcion ON public.tbl_64_d_entrega_repuesto (fecha_recepcion_64);

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_63_responsable') THEN
    ALTER TABLE public.tbl_63_m_entrega_repuesto
      ADD CONSTRAINT fk_tbl_63_responsable
      FOREIGN KEY (idresponsable_63) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_63_proveedor') THEN
    ALTER TABLE public.tbl_63_m_entrega_repuesto
      ADD CONSTRAINT fk_tbl_63_proveedor
      FOREIGN KEY (idproveedor_63) REFERENCES public.tbl_58_proveedor(idproveedor_58)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_64_maestro') THEN
    ALTER TABLE public.tbl_64_d_entrega_repuesto
      ADD CONSTRAINT fk_tbl_64_maestro
      FOREIGN KEY (identrega_64) REFERENCES public.tbl_63_m_entrega_repuesto(identrega_63)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_64_detalle_recepcion') THEN
    ALTER TABLE public.tbl_64_d_entrega_repuesto
      ADD CONSTRAINT fk_tbl_64_detalle_recepcion
      FOREIGN KEY (iddetalle_recepcion_64) REFERENCES public.tbl_60_d_recepcion_repuesto(iddetalle_60)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_64_estado') THEN
    ALTER TABLE public.tbl_64_d_entrega_repuesto
      ADD CONSTRAINT fk_tbl_64_estado
      FOREIGN KEY (idestado_reparacion_64) REFERENCES public.tbl_61_estado_reparacion(idestado_61)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Folio automático: ERD-YYYY-NNNN
CREATE OR REPLACE FUNCTION fn_generar_folio_entrega_63()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_63 IS NULL OR TRIM(NEW.folio_63) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_entrega_63, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_63 ~ ('^ERD-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_63, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_63_m_entrega_repuesto;

        NEW.folio_63 := 'ERD-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_entrega_63 ON public.tbl_63_m_entrega_repuesto;
CREATE TRIGGER trg_generar_folio_entrega_63
    BEFORE INSERT ON public.tbl_63_m_entrega_repuesto
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_entrega_63();

-- Seed estados de reparación
INSERT INTO public.tbl_61_estado_reparacion (codigo_61, nombre_61, activo_61)
SELECT v.codigo, v.nombre, true
FROM (VALUES
  ('EN_REPARACION', 'En reparación'),
  ('ESPERANDO_REPUESTO', 'Esperando repuesto'),
  ('REPARADO', 'Reparado'),
  ('NO_REPARABLE', 'No reparable')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_61_estado_reparacion e WHERE e.codigo_61 = v.codigo
);

-- Seed semáforo 0-5 / 6-15 / 16+
INSERT INTO public.tbl_62_semaforo_entrega (nombre_62, dias_desde_62, dias_hasta_62, color_62, activo_62)
SELECT v.nombre, v.desde, v.hasta, v.color, true
FROM (VALUES
  ('Verde', 0, 5, '#22c55e'),
  ('Amarillo', 6, 15, '#eab308'),
  ('Rojo', 16, NULL, '#ef4444')
) AS v(nombre, desde, hasta, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_62_semaforo_entrega s WHERE s.nombre_62 = v.nombre
);
