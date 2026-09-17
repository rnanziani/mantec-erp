-- Expediente de repuesto dañado (un viaje = una fila)
-- tbl_86 expediente  |  tbl_87 historial de estados
-- Reutiliza: tbl_11 maquina, tbl_21 tecnico, tbl_08 responsable,
--            tbl_57 tipo, tbl_58 proveedor
-- En DBeaver: Alt+X. Idempotente.

CREATE TABLE IF NOT EXISTS public.tbl_86_expediente_repuesto (
    idexpediente_86 serial4 NOT NULL,
    folio_86 varchar(30) NULL,
    estado_86 varchar(40) DEFAULT 'MAQUINA_A_BODEGA' NOT NULL,
    idmaquina_86 int4 NOT NULL,
    idtecnico_86 int4 NOT NULL,
    idresponsable_86 int4 NOT NULL,
    idrepuestodanado_86 int4 NOT NULL,
    observacion_86 text NULL,
    fecha_recepcion_86 date DEFAULT CURRENT_DATE NOT NULL,
    hora_86 time DEFAULT CURRENT_TIME NOT NULL,
    idproveedor_86 int4 NULL,
    fecha_entrega_proveedor_86 date NULL,
    fecha_vuelta_86 date NULL,
    valor_reparacion_86 numeric(12, 2) NULL,
    fecha_instalacion_86 date NULL,
    idtecnico_instalacion_86 int4 NULL,
    idmaquina_instalacion_86 int4 NULL,
    motivo_86 text NULL,
    observacion_instalacion_86 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_86_expediente PRIMARY KEY (idexpediente_86),
    CONSTRAINT uk_tbl_86_folio UNIQUE (folio_86),
    CONSTRAINT chk_tbl_86_estado CHECK (
        estado_86 IN (
            'MAQUINA_A_BODEGA',
            'BODEGA_A_PROVEEDOR',
            'PROVEEDOR_A_BODEGA',
            'BODEGA_A_MAQUINA'
        )
    ),
    CONSTRAINT chk_tbl_86_entrega CHECK (
        estado_86 = 'MAQUINA_A_BODEGA'
        OR (idproveedor_86 IS NOT NULL AND fecha_entrega_proveedor_86 IS NOT NULL)
    ),
    CONSTRAINT chk_tbl_86_vuelta CHECK (
        estado_86 NOT IN ('PROVEEDOR_A_BODEGA', 'BODEGA_A_MAQUINA')
        OR fecha_vuelta_86 IS NOT NULL
    ),
    CONSTRAINT chk_tbl_86_valor_reparacion CHECK (
        valor_reparacion_86 IS NULL OR valor_reparacion_86 >= 0
    ),
    CONSTRAINT chk_tbl_86_valor_en_vuelta CHECK (
        estado_86 NOT IN ('PROVEEDOR_A_BODEGA', 'BODEGA_A_MAQUINA')
        OR valor_reparacion_86 IS NOT NULL
    ),
    CONSTRAINT chk_tbl_86_instalado CHECK (
        estado_86 <> 'BODEGA_A_MAQUINA'
        OR (
            fecha_instalacion_86 IS NOT NULL
            AND idtecnico_instalacion_86 IS NOT NULL
            AND idmaquina_instalacion_86 IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_tbl_86_estado ON public.tbl_86_expediente_repuesto (estado_86);
CREATE INDEX IF NOT EXISTS idx_tbl_86_fecha_rec ON public.tbl_86_expediente_repuesto (fecha_recepcion_86 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_86_maquina ON public.tbl_86_expediente_repuesto (idmaquina_86);
CREATE INDEX IF NOT EXISTS idx_tbl_86_repuesto ON public.tbl_86_expediente_repuesto (idrepuestodanado_86);
CREATE INDEX IF NOT EXISTS idx_tbl_86_proveedor ON public.tbl_86_expediente_repuesto (idproveedor_86);
CREATE INDEX IF NOT EXISTS idx_tbl_86_garantia ON public.tbl_86_expediente_repuesto (idmaquina_86, idrepuestodanado_86, fecha_instalacion_86);

CREATE TABLE IF NOT EXISTS public.tbl_87_historial_expediente_repuesto (
    idhistorial_87 serial4 NOT NULL,
    idexpediente_87 int4 NOT NULL,
    estado_anterior_87 varchar(40) NULL,
    estado_nuevo_87 varchar(40) NOT NULL,
    observacion_87 text NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_87_historial PRIMARY KEY (idhistorial_87)
);

CREATE INDEX IF NOT EXISTS idx_tbl_87_expediente ON public.tbl_87_historial_expediente_repuesto (idexpediente_87, creado_en);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_maquina') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_maquina
      FOREIGN KEY (idmaquina_86) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_tecnico') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_tecnico
      FOREIGN KEY (idtecnico_86) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_responsable') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_responsable
      FOREIGN KEY (idresponsable_86) REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_repuesto') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_repuesto
      FOREIGN KEY (idrepuestodanado_86) REFERENCES public.tbl_57_repuesto_danado(idrepuestodanado_57)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_proveedor') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_proveedor
      FOREIGN KEY (idproveedor_86) REFERENCES public.tbl_58_proveedor(idproveedor_58)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_tecnico_inst') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_tecnico_inst
      FOREIGN KEY (idtecnico_instalacion_86) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_86_maquina_inst') THEN
    ALTER TABLE public.tbl_86_expediente_repuesto
      ADD CONSTRAINT fk_tbl_86_maquina_inst
      FOREIGN KEY (idmaquina_instalacion_86) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_87_expediente') THEN
    ALTER TABLE public.tbl_87_historial_expediente_repuesto
      ADD CONSTRAINT fk_tbl_87_expediente
      FOREIGN KEY (idexpediente_87) REFERENCES public.tbl_86_expediente_repuesto(idexpediente_86)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Tablas ya creadas antes de existir la columna (sin DO $$: DBeaver corta en el ;)
ALTER TABLE public.tbl_86_expediente_repuesto
  ADD COLUMN IF NOT EXISTS valor_reparacion_86 numeric(12, 2) NULL;

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_valor_reparacion;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_valor_reparacion
  CHECK (valor_reparacion_86 IS NULL OR valor_reparacion_86 >= 0);

ALTER TABLE public.tbl_86_expediente_repuesto
  DROP CONSTRAINT IF EXISTS chk_tbl_86_valor_en_vuelta;

ALTER TABLE public.tbl_86_expediente_repuesto
  ADD CONSTRAINT chk_tbl_86_valor_en_vuelta CHECK (
    estado_86 NOT IN ('PROVEEDOR_A_BODEGA', 'BODEGA_A_MAQUINA')
    OR valor_reparacion_86 IS NOT NULL
  );

CREATE OR REPLACE FUNCTION fn_generar_folio_expediente_86()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_86 IS NULL OR TRIM(NEW.folio_86) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_recepcion_86, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_86 ~ ('^EXP-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_86, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_86_expediente_repuesto;

        NEW.folio_86 := 'EXP-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_expediente_86 ON public.tbl_86_expediente_repuesto;
CREATE TRIGGER trg_generar_folio_expediente_86
    BEFORE INSERT ON public.tbl_86_expediente_repuesto
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_expediente_86();

CREATE OR REPLACE FUNCTION fn_touch_expediente_86()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_expediente_86 ON public.tbl_86_expediente_repuesto;
CREATE TRIGGER trg_touch_expediente_86
    BEFORE UPDATE ON public.tbl_86_expediente_repuesto
    FOR EACH ROW
    EXECUTE FUNCTION fn_touch_expediente_86();
