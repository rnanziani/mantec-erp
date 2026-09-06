-- PASO 2: trazabilidad de neumaticos (maestro + 4 detalles)
-- En DBeaver: Alt+X (Execute SQL Script), sin seleccionar un trozo.
-- Defaults:
--   posiciones = catalogo unico (no por tipo de maquina)
--   rotacion = origen + destino por linea (patron tbl_35 opcional)
--   tbl_34 se escribe al guardar (la pantalla Historial puede seguir)
--   danos: semilla corta, se edita en catálogo

SELECT 1 AS paso2_inicio;

CREATE TABLE IF NOT EXISTS public.tbl_73_posicion_neumatico (
  idposicion_73 serial4 NOT NULL,
  codigo_73 varchar(20) NOT NULL,
  descripcion_73 varchar(120) NOT NULL,
  numero_73 int4 NULL,
  orden_73 int4 DEFAULT 100 NOT NULL,
  activo_73 bool DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_73_posicion PRIMARY KEY (idposicion_73),
  CONSTRAINT uk_tbl_73_codigo UNIQUE (codigo_73),
  CONSTRAINT chk_tbl_73_codigo CHECK (TRIM(BOTH FROM codigo_73) <> ''),
  CONSTRAINT chk_tbl_73_descripcion CHECK (TRIM(BOTH FROM descripcion_73) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_73_activo ON public.tbl_73_posicion_neumatico (activo_73, orden_73);

ALTER TABLE public.tbl_73_posicion_neumatico
  ADD COLUMN IF NOT EXISTS numero_73 int4 NULL;

CREATE TABLE IF NOT EXISTS public.tbl_74_tipo_dano_neumatico (
  iddano_neumatico_74 serial4 NOT NULL,
  codigo_74 varchar(20) NOT NULL,
  descripcion_74 varchar(120) NOT NULL,
  activo_74 bool DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_74_dano_neu PRIMARY KEY (iddano_neumatico_74),
  CONSTRAINT uk_tbl_74_codigo UNIQUE (codigo_74),
  CONSTRAINT chk_tbl_74_codigo CHECK (TRIM(BOTH FROM codigo_74) <> ''),
  CONSTRAINT chk_tbl_74_descripcion CHECK (TRIM(BOTH FROM descripcion_74) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_74_activo ON public.tbl_74_tipo_dano_neumatico (activo_74);

CREATE TABLE IF NOT EXISTS public.tbl_75_tipo_dano_llanta (
  iddano_llanta_75 serial4 NOT NULL,
  codigo_75 varchar(20) NOT NULL,
  descripcion_75 varchar(120) NOT NULL,
  activo_75 bool DEFAULT true NOT NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_75_dano_lla PRIMARY KEY (iddano_llanta_75),
  CONSTRAINT uk_tbl_75_codigo UNIQUE (codigo_75),
  CONSTRAINT chk_tbl_75_codigo CHECK (TRIM(BOTH FROM codigo_75) <> ''),
  CONSTRAINT chk_tbl_75_descripcion CHECK (TRIM(BOTH FROM descripcion_75) <> '')
);

CREATE INDEX IF NOT EXISTS idx_tbl_75_activo ON public.tbl_75_tipo_dano_llanta (activo_75);

CREATE TABLE IF NOT EXISTS public.tbl_76_m_trazabilidad_neumatico (
  idtrazabilidad_76 serial4 NOT NULL,
  folio_76 varchar(30) NULL,
  idmaquina_76 int4 NOT NULL,
  idconductor_76 int4 NOT NULL,
  idtecnico_76 int4 NOT NULL,
  km_maquina_76 numeric(12, 1) DEFAULT 0 NOT NULL,
  fecha_76 date DEFAULT CURRENT_DATE NOT NULL,
  hora_76 time DEFAULT CURRENT_TIME NOT NULL,
  observacion_76 text NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_76_trazabilidad PRIMARY KEY (idtrazabilidad_76),
  CONSTRAINT uk_tbl_76_folio UNIQUE (folio_76),
  CONSTRAINT chk_tbl_76_km CHECK (km_maquina_76 >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tbl_76_maquina ON public.tbl_76_m_trazabilidad_neumatico (idmaquina_76);
CREATE INDEX IF NOT EXISTS idx_tbl_76_conductor ON public.tbl_76_m_trazabilidad_neumatico (idconductor_76);
CREATE INDEX IF NOT EXISTS idx_tbl_76_tecnico ON public.tbl_76_m_trazabilidad_neumatico (idtecnico_76);
CREATE INDEX IF NOT EXISTS idx_tbl_76_fecha ON public.tbl_76_m_trazabilidad_neumatico (fecha_76 DESC);

CREATE TABLE IF NOT EXISTS public.tbl_77_d_montaje_neumatico (
  iddetalle_77 serial4 NOT NULL,
  idtrazabilidad_77 int4 NOT NULL,
  idneumatico_77 int4 NOT NULL,
  idposicion_77 int4 NOT NULL,
  observacion_77 text NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_77_montaje PRIMARY KEY (iddetalle_77),
  CONSTRAINT uk_tbl_77_neu UNIQUE (idtrazabilidad_77, idneumatico_77),
  CONSTRAINT uk_tbl_77_pos UNIQUE (idtrazabilidad_77, idposicion_77)
);

CREATE INDEX IF NOT EXISTS idx_tbl_77_maestro ON public.tbl_77_d_montaje_neumatico (idtrazabilidad_77);
CREATE INDEX IF NOT EXISTS idx_tbl_77_neu ON public.tbl_77_d_montaje_neumatico (idneumatico_77);

CREATE TABLE IF NOT EXISTS public.tbl_78_d_rotacion_neumatico (
  iddetalle_78 serial4 NOT NULL,
  idtrazabilidad_78 int4 NOT NULL,
  idneumatico_78 int4 NOT NULL,
  idposicion_origen_78 int4 NOT NULL,
  idposicion_destino_78 int4 NOT NULL,
  idpatron_78 int4 NULL,
  observacion_78 text NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_78_rotacion PRIMARY KEY (iddetalle_78),
  CONSTRAINT uk_tbl_78_neu UNIQUE (idtrazabilidad_78, idneumatico_78),
  CONSTRAINT chk_tbl_78_pos_distintas CHECK (idposicion_origen_78 <> idposicion_destino_78)
);

CREATE INDEX IF NOT EXISTS idx_tbl_78_maestro ON public.tbl_78_d_rotacion_neumatico (idtrazabilidad_78);
CREATE INDEX IF NOT EXISTS idx_tbl_78_neu ON public.tbl_78_d_rotacion_neumatico (idneumatico_78);

CREATE TABLE IF NOT EXISTS public.tbl_79_d_llanta_trazabilidad (
  iddetalle_79 serial4 NOT NULL,
  idtrazabilidad_79 int4 NOT NULL,
  idllanta_79 int4 NOT NULL,
  iddano_llanta_79 int4 NULL,
  observacion_79 text NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_79_llanta PRIMARY KEY (iddetalle_79)
);

CREATE INDEX IF NOT EXISTS idx_tbl_79_maestro ON public.tbl_79_d_llanta_trazabilidad (idtrazabilidad_79);
CREATE INDEX IF NOT EXISTS idx_tbl_79_llanta ON public.tbl_79_d_llanta_trazabilidad (idllanta_79);

CREATE TABLE IF NOT EXISTS public.tbl_80_d_baja_neumatico (
  iddetalle_80 serial4 NOT NULL,
  idtrazabilidad_80 int4 NOT NULL,
  idneumatico_80 int4 NOT NULL,
  iddano_neumatico_80 int4 NOT NULL,
  observacion_80 text NULL,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  actualizado_en timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT pk_tbl_80_baja PRIMARY KEY (iddetalle_80),
  CONSTRAINT uk_tbl_80_neu UNIQUE (idtrazabilidad_80, idneumatico_80)
);

CREATE INDEX IF NOT EXISTS idx_tbl_80_maestro ON public.tbl_80_d_baja_neumatico (idtrazabilidad_80);
CREATE INDEX IF NOT EXISTS idx_tbl_80_neu ON public.tbl_80_d_baja_neumatico (idneumatico_80);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_76_maquina') THEN
    ALTER TABLE public.tbl_76_m_trazabilidad_neumatico
      ADD CONSTRAINT fk_tbl_76_maquina
      FOREIGN KEY (idmaquina_76) REFERENCES public.tbl_11_maquina(idmaquina_11)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_76_conductor') THEN
    ALTER TABLE public.tbl_76_m_trazabilidad_neumatico
      ADD CONSTRAINT fk_tbl_76_conductor
      FOREIGN KEY (idconductor_76) REFERENCES public.tbl_06_trabajador(idtrabajador_06)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_76_tecnico') THEN
    ALTER TABLE public.tbl_76_m_trazabilidad_neumatico
      ADD CONSTRAINT fk_tbl_76_tecnico
      FOREIGN KEY (idtecnico_76) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_77_maestro') THEN
    ALTER TABLE public.tbl_77_d_montaje_neumatico
      ADD CONSTRAINT fk_tbl_77_maestro
      FOREIGN KEY (idtrazabilidad_77) REFERENCES public.tbl_76_m_trazabilidad_neumatico(idtrazabilidad_76)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_77_neu') THEN
    ALTER TABLE public.tbl_77_d_montaje_neumatico
      ADD CONSTRAINT fk_tbl_77_neu
      FOREIGN KEY (idneumatico_77) REFERENCES public.tbl_31_neumatico(id_neumatico_31)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_77_pos') THEN
    ALTER TABLE public.tbl_77_d_montaje_neumatico
      ADD CONSTRAINT fk_tbl_77_pos
      FOREIGN KEY (idposicion_77) REFERENCES public.tbl_73_posicion_neumatico(idposicion_73)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_78_maestro') THEN
    ALTER TABLE public.tbl_78_d_rotacion_neumatico
      ADD CONSTRAINT fk_tbl_78_maestro
      FOREIGN KEY (idtrazabilidad_78) REFERENCES public.tbl_76_m_trazabilidad_neumatico(idtrazabilidad_76)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_78_neu') THEN
    ALTER TABLE public.tbl_78_d_rotacion_neumatico
      ADD CONSTRAINT fk_tbl_78_neu
      FOREIGN KEY (idneumatico_78) REFERENCES public.tbl_31_neumatico(id_neumatico_31)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_78_origen') THEN
    ALTER TABLE public.tbl_78_d_rotacion_neumatico
      ADD CONSTRAINT fk_tbl_78_origen
      FOREIGN KEY (idposicion_origen_78) REFERENCES public.tbl_73_posicion_neumatico(idposicion_73)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_78_destino') THEN
    ALTER TABLE public.tbl_78_d_rotacion_neumatico
      ADD CONSTRAINT fk_tbl_78_destino
      FOREIGN KEY (idposicion_destino_78) REFERENCES public.tbl_73_posicion_neumatico(idposicion_73)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_78_patron') THEN
    ALTER TABLE public.tbl_78_d_rotacion_neumatico
      ADD CONSTRAINT fk_tbl_78_patron
      FOREIGN KEY (idpatron_78) REFERENCES public.tbl_35_patron_rotacion(id_patron_35)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_79_maestro') THEN
    ALTER TABLE public.tbl_79_d_llanta_trazabilidad
      ADD CONSTRAINT fk_tbl_79_maestro
      FOREIGN KEY (idtrazabilidad_79) REFERENCES public.tbl_76_m_trazabilidad_neumatico(idtrazabilidad_76)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_79_llanta') THEN
    ALTER TABLE public.tbl_79_d_llanta_trazabilidad
      ADD CONSTRAINT fk_tbl_79_llanta
      FOREIGN KEY (idllanta_79) REFERENCES public.tbl_36_llanta(id_llanta_36)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_79_dano') THEN
    ALTER TABLE public.tbl_79_d_llanta_trazabilidad
      ADD CONSTRAINT fk_tbl_79_dano
      FOREIGN KEY (iddano_llanta_79) REFERENCES public.tbl_75_tipo_dano_llanta(iddano_llanta_75)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_80_maestro') THEN
    ALTER TABLE public.tbl_80_d_baja_neumatico
      ADD CONSTRAINT fk_tbl_80_maestro
      FOREIGN KEY (idtrazabilidad_80) REFERENCES public.tbl_76_m_trazabilidad_neumatico(idtrazabilidad_76)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_80_neu') THEN
    ALTER TABLE public.tbl_80_d_baja_neumatico
      ADD CONSTRAINT fk_tbl_80_neu
      FOREIGN KEY (idneumatico_80) REFERENCES public.tbl_31_neumatico(id_neumatico_31)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_80_dano') THEN
    ALTER TABLE public.tbl_80_d_baja_neumatico
      ADD CONSTRAINT fk_tbl_80_dano
      FOREIGN KEY (iddano_neumatico_80) REFERENCES public.tbl_74_tipo_dano_neumatico(iddano_neumatico_74)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_generar_folio_trazabilidad_76()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio text;
  v_seq int;
BEGIN
  IF NEW.folio_76 IS NULL OR TRIM(NEW.folio_76) = '' THEN
    v_anio := to_char(COALESCE(NEW.fecha_76, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(
      CASE
        WHEN folio_76 ~ ('^TNE-' || v_anio || '-[0-9]+$')
        THEN CAST(split_part(folio_76, '-', 3) AS int)
        ELSE 0
      END
    ), 0) + 1
    INTO v_seq
    FROM public.tbl_76_m_trazabilidad_neumatico;

    NEW.folio_76 := 'TNE-' || v_anio || '-' || lpad(v_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_folio_trazabilidad_76 ON public.tbl_76_m_trazabilidad_neumatico;
CREATE TRIGGER trg_generar_folio_trazabilidad_76
  BEFORE INSERT ON public.tbl_76_m_trazabilidad_neumatico
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generar_folio_trazabilidad_76();

-- Plano bus 8 posiciones: numero_73 = (1)..(8) del croquis / tbl_35
INSERT INTO public.tbl_73_posicion_neumatico (codigo_73, descripcion_73, numero_73, orden_73)
SELECT v.codigo, v.descripcion, v.numero, v.numero
FROM (VALUES
  ('L1',  'Eje 1 direccional izquierdo', 1),
  ('R1',  'Eje 1 direccional derecho', 2),
  ('L2i', 'Eje 2 traccion izquierdo interno', 3),
  ('R2i', 'Eje 2 traccion derecho interno', 4),
  ('L2o', 'Eje 2 traccion izquierdo externo', 5),
  ('R2o', 'Eje 2 traccion derecho externo', 6),
  ('L3',  'Eje 3 apoyo / tag izquierdo', 7),
  ('R3',  'Eje 3 apoyo / tag derecho', 8)
) AS v(codigo, descripcion, numero)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_73_posicion_neumatico p WHERE p.codigo_73 = v.codigo
);

UPDATE public.tbl_73_posicion_neumatico p
SET
  descripcion_73 = v.descripcion,
  numero_73 = v.numero,
  orden_73 = v.numero,
  activo_73 = true,
  actualizado_en = CURRENT_TIMESTAMP
FROM (VALUES
  ('L1',  'Eje 1 direccional izquierdo', 1),
  ('R1',  'Eje 1 direccional derecho', 2),
  ('L2i', 'Eje 2 traccion izquierdo interno', 3),
  ('R2i', 'Eje 2 traccion derecho interno', 4),
  ('L2o', 'Eje 2 traccion izquierdo externo', 5),
  ('R2o', 'Eje 2 traccion derecho externo', 6),
  ('L3',  'Eje 3 apoyo / tag izquierdo', 7),
  ('R3',  'Eje 3 apoyo / tag derecho', 8)
) AS v(codigo, descripcion, numero)
WHERE p.codigo_73 = v.codigo;

UPDATE public.tbl_73_posicion_neumatico
SET activo_73 = false, actualizado_en = CURRENT_TIMESTAMP
WHERE codigo_73 IN ('1E', '1D', '2E', '2D', '3E', '3D', '4E', '4D', '5E', '5D', 'AUX')
  AND codigo_73 NOT IN ('L1', 'R1', 'L2i', 'R2i', 'L2o', 'R2o', 'L3', 'R3');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_73_numero') THEN
    ALTER TABLE public.tbl_73_posicion_neumatico
      ADD CONSTRAINT uk_tbl_73_numero UNIQUE (numero_73);
  END IF;
END $$;

INSERT INTO public.tbl_74_tipo_dano_neumatico (codigo_74, descripcion_74)
SELECT v.codigo, v.descripcion
FROM (VALUES
  ('DESGASTE', 'Desgaste irregular o al limite'),
  ('PONCHADURA', 'Ponchadura / perdida de aire'),
  ('CORTE', 'Corte en banda o flanco'),
  ('SEPARACION', 'Separacion de banda'),
  ('REVENTON', 'Reventon')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_74_tipo_dano_neumatico t WHERE t.codigo_74 = v.codigo
);

INSERT INTO public.tbl_75_tipo_dano_llanta (codigo_75, descripcion_75)
SELECT v.codigo, v.descripcion
FROM (VALUES
  ('DOBLADA', 'Llanta doblada'),
  ('GRIETA', 'Grieta o fisura'),
  ('OXIDO', 'Oxido excesivo'),
  ('PERNO', 'Perno o valvula danada')
) AS v(codigo, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_75_tipo_dano_llanta t WHERE t.codigo_75 = v.codigo
);

SELECT 'tbl_73' AS tabla, COUNT(*) AS filas FROM public.tbl_73_posicion_neumatico
UNION ALL SELECT 'tbl_74', COUNT(*) FROM public.tbl_74_tipo_dano_neumatico
UNION ALL SELECT 'tbl_75', COUNT(*) FROM public.tbl_75_tipo_dano_llanta
UNION ALL SELECT 'tbl_76', COUNT(*) FROM public.tbl_76_m_trazabilidad_neumatico
UNION ALL SELECT 'tbl_77', COUNT(*) FROM public.tbl_77_d_montaje_neumatico
UNION ALL SELECT 'tbl_78', COUNT(*) FROM public.tbl_78_d_rotacion_neumatico
UNION ALL SELECT 'tbl_79', COUNT(*) FROM public.tbl_79_d_llanta_trazabilidad
UNION ALL SELECT 'tbl_80', COUNT(*) FROM public.tbl_80_d_baja_neumatico;
