-- ============================================
-- Recepción de repuestos dañados (normalizado)
-- tbl_57 catálogo repuesto dañado
-- tbl_58 catálogo proveedor
-- tbl_59 maestro recepción
-- tbl_60 detalle recepción (estado por línea)
-- ============================================

-- 1) Catálogo: repuesto dañado
CREATE TABLE IF NOT EXISTS public.tbl_57_repuesto_danado (
    idrepuestodanado_57 serial4 NOT NULL,
    codigo_57 varchar(30) NULL,
    nombre_57 varchar(120) NOT NULL,
    descripcion_57 text NULL,
    activo_57 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_57_repuesto_danado PRIMARY KEY (idrepuestodanado_57),
    CONSTRAINT chk_tbl_57_nombre_no_vacio CHECK (TRIM(BOTH FROM nombre_57) <> ''),
    CONSTRAINT uk_tbl_57_codigo UNIQUE (codigo_57)
);

CREATE INDEX IF NOT EXISTS idx_tbl_57_activo ON public.tbl_57_repuesto_danado (activo_57);
CREATE INDEX IF NOT EXISTS idx_tbl_57_nombre ON public.tbl_57_repuesto_danado (nombre_57);

-- 2) Catálogo: proveedor
CREATE TABLE IF NOT EXISTS public.tbl_58_proveedor (
    idproveedor_58 serial4 NOT NULL,
    rut_58 varchar(20) NULL,
    nombre_58 varchar(150) NOT NULL,
    contacto_58 varchar(120) NULL,
    telefono_58 varchar(40) NULL,
    email_58 varchar(120) NULL,
    activo_58 bool DEFAULT true NOT NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_58_proveedor PRIMARY KEY (idproveedor_58),
    CONSTRAINT chk_tbl_58_nombre_no_vacio CHECK (TRIM(BOTH FROM nombre_58) <> ''),
    CONSTRAINT uk_tbl_58_rut UNIQUE (rut_58)
);

CREATE INDEX IF NOT EXISTS idx_tbl_58_activo ON public.tbl_58_proveedor (activo_58);
CREATE INDEX IF NOT EXISTS idx_tbl_58_nombre ON public.tbl_58_proveedor (nombre_58);

-- 3) Maestro: recepción
CREATE TABLE IF NOT EXISTS public.tbl_59_m_recepcion_repuesto (
    idrecepcion_59 serial4 NOT NULL,
    folio_59 varchar(30) NULL,
    idmaquina_59 int4 NOT NULL,
    idtecnico_59 int4 NOT NULL,
    idresponsable_59 int4 NOT NULL,
    idproveedor_59 int4 NOT NULL,
    fecha_59 date DEFAULT CURRENT_DATE NOT NULL,
    hora_59 time DEFAULT CURRENT_TIME NOT NULL,
    observacion_59 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_59_m_recepcion_repuesto PRIMARY KEY (idrecepcion_59),
    CONSTRAINT uk_tbl_59_folio UNIQUE (folio_59)
);

CREATE INDEX IF NOT EXISTS idx_tbl_59_fecha ON public.tbl_59_m_recepcion_repuesto (fecha_59 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_59_maquina ON public.tbl_59_m_recepcion_repuesto (idmaquina_59);
CREATE INDEX IF NOT EXISTS idx_tbl_59_tecnico ON public.tbl_59_m_recepcion_repuesto (idtecnico_59);
CREATE INDEX IF NOT EXISTS idx_tbl_59_proveedor ON public.tbl_59_m_recepcion_repuesto (idproveedor_59);

-- 4) Detalle: líneas (estado por repuesto)
CREATE TABLE IF NOT EXISTS public.tbl_60_d_recepcion_repuesto (
    iddetalle_60 serial4 NOT NULL,
    idrecepcion_60 int4 NOT NULL,
    idrepuestodanado_60 int4 NOT NULL,
    cantidad_60 int4 DEFAULT 1 NOT NULL,
    estado_60 varchar(30) DEFAULT 'PENDIENTE' NOT NULL,
    observacion_60 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_60_d_recepcion_repuesto PRIMARY KEY (iddetalle_60),
    CONSTRAINT chk_tbl_60_cantidad_positiva CHECK (cantidad_60 > 0),
    CONSTRAINT chk_tbl_60_estado_valido CHECK (
        estado_60 IN ('PENDIENTE', 'ENVIADO_PROVEEDOR', 'RECIBIDO', 'ANULADO')
    ),
    CONSTRAINT uk_tbl_60_recepcion_repuesto UNIQUE (idrecepcion_60, idrepuestodanado_60)
);

CREATE INDEX IF NOT EXISTS idx_tbl_60_recepcion ON public.tbl_60_d_recepcion_repuesto (idrecepcion_60);
CREATE INDEX IF NOT EXISTS idx_tbl_60_repuesto ON public.tbl_60_d_recepcion_repuesto (idrepuestodanado_60);
CREATE INDEX IF NOT EXISTS idx_tbl_60_estado ON public.tbl_60_d_recepcion_repuesto (estado_60);

-- Foreign keys (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_59_maquina') THEN
    ALTER TABLE public.tbl_59_m_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_59_maquina
      FOREIGN KEY (idmaquina_59) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_59_tecnico') THEN
    ALTER TABLE public.tbl_59_m_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_59_tecnico
      FOREIGN KEY (idtecnico_59) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_59_responsable') THEN
    ALTER TABLE public.tbl_59_m_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_59_responsable
      FOREIGN KEY (idresponsable_59) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_59_proveedor') THEN
    ALTER TABLE public.tbl_59_m_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_59_proveedor
      FOREIGN KEY (idproveedor_59) REFERENCES public.tbl_58_proveedor(idproveedor_58)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_60_maestro') THEN
    ALTER TABLE public.tbl_60_d_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_60_maestro
      FOREIGN KEY (idrecepcion_60) REFERENCES public.tbl_59_m_recepcion_repuesto(idrecepcion_59)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_60_repuesto') THEN
    ALTER TABLE public.tbl_60_d_recepcion_repuesto
      ADD CONSTRAINT fk_tbl_60_repuesto
      FOREIGN KEY (idrepuestodanado_60) REFERENCES public.tbl_57_repuesto_danado(idrepuestodanado_57)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Folio automático: RRD-YYYY-NNNN
CREATE OR REPLACE FUNCTION fn_generar_folio_recepcion_59()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_59 IS NULL OR TRIM(NEW.folio_59) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_59, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_59 ~ ('^RRD-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_59, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_59_m_recepcion_repuesto;

        NEW.folio_59 := 'RRD-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_recepcion_59 ON public.tbl_59_m_recepcion_repuesto;
CREATE TRIGGER trg_generar_folio_recepcion_59
    BEFORE INSERT ON public.tbl_59_m_recepcion_repuesto
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_recepcion_59();
