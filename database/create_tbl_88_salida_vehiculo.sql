-- Control de vehículo de bodega: un folio = un viaje (sale y regresa)
-- tbl_88. No usar 87: esa es tbl_87_historial_expediente_repuesto.
-- Igual que el pañol: dos momentos, dos pares de firmas. El daño se declara al regreso.
-- Conductor = último que lo usó (tbl_06). Responsable = tbl_08 en cada punta.
-- En DBeaver: Alt+X. Idempotente.

DO $$
BEGIN
  -- Primera versión era solo-salida (sin columnas de regreso).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tbl_88_salida_vehiculo'
      AND column_name = 'firmaresponsable_88'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tbl_88_salida_vehiculo'
      AND column_name = 'firmaresponsable_salida_88'
  ) THEN
    DROP TABLE public.tbl_88_salida_vehiculo CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tbl_88_salida_vehiculo (
    idsalidavehiculo_88 serial4 NOT NULL,
    folio_88 varchar(30) NULL,
    patente_88 varchar(12) NOT NULL,
    estado_88 varchar(20) DEFAULT 'EN_RUTA' NOT NULL,
    fecha_salida_88 date DEFAULT CURRENT_DATE NOT NULL,
    hora_salida_88 time DEFAULT CURRENT_TIME NOT NULL,
    idresponsable_salida_88 int4 NOT NULL,
    idconductor_88 int4 NOT NULL,
    observacion_salida_88 text NULL,
    firmaresponsable_salida_88 text NOT NULL,
    firmaconductor_salida_88 text NOT NULL,
    fecha_regreso_88 date NULL,
    hora_regreso_88 time NULL,
    idresponsable_regreso_88 int4 NULL,
    observacion_regreso_88 text NULL,
    con_dano_88 boolean NULL,
    firmaresponsable_regreso_88 text NULL,
    firmaconductor_regreso_88 text NULL,
    idusuario_88 int4 NULL,
    creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_tbl_88_salida_vehiculo PRIMARY KEY (idsalidavehiculo_88),
    CONSTRAINT uk_tbl_88_folio UNIQUE (folio_88),
    CONSTRAINT chk_tbl_88_estado CHECK (estado_88 IN ('EN_RUTA', 'DEVUELTO')),
    CONSTRAINT chk_tbl_88_patente CHECK (
        CHAR_LENGTH(TRIM(patente_88)) BETWEEN 5 AND 12
    ),
    CONSTRAINT chk_tbl_88_firmas_salida CHECK (
        TRIM(firmaresponsable_salida_88) <> ''
        AND TRIM(firmaconductor_salida_88) <> ''
    ),
    CONSTRAINT chk_tbl_88_regreso CHECK (
        estado_88 = 'EN_RUTA'
        OR (
            fecha_regreso_88 IS NOT NULL
            AND hora_regreso_88 IS NOT NULL
            AND idresponsable_regreso_88 IS NOT NULL
            AND con_dano_88 IS NOT NULL
            AND TRIM(COALESCE(firmaresponsable_regreso_88, '')) <> ''
            AND TRIM(COALESCE(firmaconductor_regreso_88, '')) <> ''
            AND (
                con_dano_88 = false
                OR TRIM(COALESCE(observacion_regreso_88, '')) <> ''
            )
        )
    ),
    CONSTRAINT chk_tbl_88_fechas CHECK (
        fecha_regreso_88 IS NULL
        OR hora_regreso_88 IS NULL
        OR (fecha_regreso_88 + hora_regreso_88)
            >= (fecha_salida_88 + hora_salida_88)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_tbl_88_patente_en_ruta
    ON public.tbl_88_salida_vehiculo (patente_88)
    WHERE estado_88 = 'EN_RUTA';

CREATE INDEX IF NOT EXISTS idx_tbl_88_fecha_salida
    ON public.tbl_88_salida_vehiculo (fecha_salida_88 DESC, hora_salida_88 DESC);
CREATE INDEX IF NOT EXISTS idx_tbl_88_patente ON public.tbl_88_salida_vehiculo (patente_88);
CREATE INDEX IF NOT EXISTS idx_tbl_88_estado ON public.tbl_88_salida_vehiculo (estado_88);
CREATE INDEX IF NOT EXISTS idx_tbl_88_conductor ON public.tbl_88_salida_vehiculo (idconductor_88);
CREATE INDEX IF NOT EXISTS idx_tbl_88_responsable_salida
    ON public.tbl_88_salida_vehiculo (idresponsable_salida_88);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_88_responsable_salida') THEN
    ALTER TABLE public.tbl_88_salida_vehiculo
      ADD CONSTRAINT fk_tbl_88_responsable_salida
      FOREIGN KEY (idresponsable_salida_88)
      REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_88_responsable_regreso') THEN
    ALTER TABLE public.tbl_88_salida_vehiculo
      ADD CONSTRAINT fk_tbl_88_responsable_regreso
      FOREIGN KEY (idresponsable_regreso_88)
      REFERENCES public.tbl_08_responsable_entrega(idresponsableentrega_08)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_88_conductor') THEN
    ALTER TABLE public.tbl_88_salida_vehiculo
      ADD CONSTRAINT fk_tbl_88_conductor
      FOREIGN KEY (idconductor_88)
      REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_88_usuario') THEN
    ALTER TABLE public.tbl_88_salida_vehiculo
      ADD CONSTRAINT fk_tbl_88_usuario
      FOREIGN KEY (idusuario_88)
      REFERENCES public.tbl_00_usuario(id_usuario_00)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_normalizar_salida_vehiculo_88()
RETURNS TRIGGER AS $$
BEGIN
    NEW.patente_88 := UPPER(REGEXP_REPLACE(TRIM(NEW.patente_88), '[\s\-]', '', 'g'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_salida_vehiculo_88 ON public.tbl_88_salida_vehiculo;
CREATE TRIGGER trg_normalizar_salida_vehiculo_88
    BEFORE INSERT OR UPDATE ON public.tbl_88_salida_vehiculo
    FOR EACH ROW
    EXECUTE FUNCTION fn_normalizar_salida_vehiculo_88();

CREATE OR REPLACE FUNCTION fn_generar_folio_salida_vehiculo_88()
RETURNS TRIGGER AS $$
DECLARE
    v_anio text;
    v_seq int;
BEGIN
    IF NEW.folio_88 IS NULL OR TRIM(NEW.folio_88) = '' THEN
        v_anio := to_char(COALESCE(NEW.fecha_salida_88, CURRENT_DATE), 'YYYY');
        SELECT COALESCE(MAX(
            CASE
                WHEN folio_88 ~ ('^SAL-' || v_anio || '-[0-9]+$')
                THEN CAST(split_part(folio_88, '-', 3) AS int)
                ELSE 0
            END
        ), 0) + 1
        INTO v_seq
        FROM tbl_88_salida_vehiculo;

        NEW.folio_88 := 'SAL-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_folio_salida_vehiculo_88 ON public.tbl_88_salida_vehiculo;
CREATE TRIGGER trg_generar_folio_salida_vehiculo_88
    BEFORE INSERT ON public.tbl_88_salida_vehiculo
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_folio_salida_vehiculo_88();

CREATE OR REPLACE FUNCTION fn_touch_salida_vehiculo_88()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_salida_vehiculo_88 ON public.tbl_88_salida_vehiculo;
CREATE TRIGGER trg_touch_salida_vehiculo_88
    BEFORE UPDATE ON public.tbl_88_salida_vehiculo
    FOR EACH ROW
    EXECUTE FUNCTION fn_touch_salida_vehiculo_88();
