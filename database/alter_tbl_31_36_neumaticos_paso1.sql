-- PASO 1: correcciones tbl_31 a tbl_36 y codigo TS-NNNNYY
-- En DBeaver: clic en el editor y Alt+X (Execute SQL Script).
-- No uses Ctrl+Enter ni selecciones un trozo del archivo.

SELECT 1 AS paso1_inicio;

INSERT INTO public.tbl_33_estado_neumatico (estado_33, descripcion_33, activo_33, orden_33, color_33)
SELECT v.estado, v.descripcion, true, v.orden, v.color
FROM (VALUES
  ('NUEVO', 'Neumatico nuevo en bodega / sin montar', 10, '#2e7d32'),
  ('MONTADO', 'Montado en maquina', 20, '#ef6c00'),
  ('EN_BODEGA', 'En bodega (usado o desmontado)', 30, '#1565c0'),
  ('BAJA', 'Dado de baja', 40, '#c62828')
) AS v(estado, descripcion, orden, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tbl_33_estado_neumatico e
  WHERE UPPER(TRIM(e.estado_33)) = v.estado
);

DROP TRIGGER IF EXISTS trigger_generar_codigo_neumatico_31 ON public.tbl_31_neumatico;

ALTER TABLE public.tbl_34_historial_neumatico
  DROP CONSTRAINT IF EXISTS fk_hist34_neumatico_cod;

ALTER TABLE public.tbl_31_neumatico
  ALTER COLUMN cod_neumatico_31 TYPE varchar(12);

ALTER TABLE public.tbl_34_historial_neumatico
  ALTER COLUMN cod_neumatico_34 TYPE varchar(12);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hist34_neumatico_cod') THEN
    ALTER TABLE public.tbl_34_historial_neumatico
      ADD CONSTRAINT fk_hist34_neumatico_cod
      FOREIGN KEY (cod_neumatico_34) REFERENCES public.tbl_31_neumatico(cod_neumatico_31)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE public.tbl_31_neumatico
  ADD COLUMN IF NOT EXISTS id_estado_31 int4 NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tbl_31_estado') THEN
    ALTER TABLE public.tbl_31_neumatico
      ADD CONSTRAINT fk_tbl_31_estado
      FOREIGN KEY (id_estado_31) REFERENCES public.tbl_33_estado_neumatico(id_estado_33)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE public.tbl_31_neumatico n
SET id_estado_31 = e.id_estado_33
FROM public.tbl_33_estado_neumatico e
WHERE n.id_estado_31 IS NULL
  AND UPPER(TRIM(e.estado_33)) = 'NUEVO';

CREATE INDEX IF NOT EXISTS idx_tbl_31_estado ON public.tbl_31_neumatico (id_estado_31);
CREATE INDEX IF NOT EXISTS idx_tbl_31_codigo ON public.tbl_31_neumatico (cod_neumatico_31);

CREATE OR REPLACE FUNCTION public.generar_codigo_neumatico_31()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  yy text;
  max_seq int;
  id_nuevo int;
BEGIN
  IF NEW.id_estado_31 IS NULL THEN
    SELECT e.id_estado_33 INTO id_nuevo
    FROM public.tbl_33_estado_neumatico e
    WHERE UPPER(TRIM(e.estado_33)) = 'NUEVO'
    LIMIT 1;
    NEW.id_estado_31 := id_nuevo;
  END IF;

  IF NEW.cod_neumatico_31 IS NOT NULL AND BTRIM(NEW.cod_neumatico_31) <> '' THEN
    RETURN NEW;
  END IF;

  yy := to_char(COALESCE(NEW.fecha_ingreso_31, CURRENT_DATE), 'YY');
  PERFORM pg_advisory_xact_lock(310031, EXTRACT(YEAR FROM COALESCE(NEW.fecha_ingreso_31, CURRENT_DATE))::int);

  SELECT COALESCE(MAX(SUBSTRING(n.cod_neumatico_31 FROM 4 FOR 4)::int), -1)
  INTO max_seq
  FROM public.tbl_31_neumatico n
  WHERE n.cod_neumatico_31 ~ ('^TS-[0-9]{4}' || yy || '$');

  IF max_seq >= 9999 THEN
    RAISE EXCEPTION 'Se alcanzo el maximo de 9999 neumaticos para el anio %', yy;
  END IF;

  NEW.cod_neumatico_31 := 'TS-' || LPAD((max_seq + 1)::text, 4, '0') || yy;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generar_codigo_neumatico_31 ON public.tbl_31_neumatico;
CREATE TRIGGER trigger_generar_codigo_neumatico_31
  BEFORE INSERT ON public.tbl_31_neumatico
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_codigo_neumatico_31();

UPDATE public.tbl_32_marca_neumatico SET estado_32 = true WHERE estado_32 IS NULL;

ALTER TABLE public.tbl_32_marca_neumatico
  ALTER COLUMN estado_32 SET DEFAULT true,
  ALTER COLUMN estado_32 SET NOT NULL;

DO $$
DECLARE
  max_id int;
BEGIN
  SELECT COALESCE(MAX(id_marca_32), 0) INTO max_id FROM public.tbl_32_marca_neumatico;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tbl_32_marca_neumatico_id_marca_32_seq') THEN
    EXECUTE format(
      'CREATE SEQUENCE public.tbl_32_marca_neumatico_id_marca_32_seq START WITH %s',
      max_id + 1
    );
  END IF;
  PERFORM setval('public.tbl_32_marca_neumatico_id_marca_32_seq', GREATEST(max_id, 1), max_id > 0);
  ALTER TABLE public.tbl_32_marca_neumatico
    ALTER COLUMN id_marca_32 SET DEFAULT nextval('public.tbl_32_marca_neumatico_id_marca_32_seq');
  ALTER SEQUENCE public.tbl_32_marca_neumatico_id_marca_32_seq
    OWNED BY public.tbl_32_marca_neumatico.id_marca_32;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tbl_32_marca_neumatico_marca_32_key'
  ) THEN
    ALTER TABLE public.tbl_32_marca_neumatico
      DROP CONSTRAINT tbl_32_marca_neumatico_marca_32_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_32_marca_diametro'
  ) THEN
    ALTER TABLE public.tbl_32_marca_neumatico
      ADD CONSTRAINT uk_tbl_32_marca_diametro UNIQUE (marca_32, diametro_32);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hist34_conductor') THEN
    IF EXISTS (
      SELECT 1 FROM public.tbl_34_historial_neumatico h
      WHERE h.id_conductor_34 IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.tbl_06_trabajador t
          WHERE t.idtrabajador_06 = h.id_conductor_34
        )
    ) THEN
      RAISE NOTICE 'fk_hist34_conductor omitida: hay conductores huerfanos en tbl_34';
    ELSE
      ALTER TABLE public.tbl_34_historial_neumatico
        ADD CONSTRAINT fk_hist34_conductor
        FOREIGN KEY (id_conductor_34) REFERENCES public.tbl_06_trabajador(idtrabajador_06)
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hist34_maquina') THEN
    IF EXISTS (
      SELECT 1 FROM public.tbl_34_historial_neumatico h
      WHERE h.id_maquina_34 IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.tbl_11_maquina m
          WHERE m.idmaquina_11 = h.id_maquina_34
        )
    ) THEN
      RAISE NOTICE 'fk_hist34_maquina omitida: hay maquinas huerfanas en tbl_34';
    ELSE
      ALTER TABLE public.tbl_34_historial_neumatico
        ADD CONSTRAINT fk_hist34_maquina
        FOREIGN KEY (id_maquina_34) REFERENCES public.tbl_11_maquina(idmaquina_11)
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_hist34_tecnico') THEN
    IF EXISTS (
      SELECT 1 FROM public.tbl_34_historial_neumatico h
      WHERE h.id_tecnico_34 IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.tbl_21_tecnico t
          WHERE t.id_tecnico_21 = h.id_tecnico_34
        )
    ) THEN
      RAISE NOTICE 'fk_hist34_tecnico omitida: hay tecnicos huerfanos en tbl_34';
    ELSE
      ALTER TABLE public.tbl_34_historial_neumatico
        ADD CONSTRAINT fk_hist34_tecnico
        FOREIGN KEY (id_tecnico_34) REFERENCES public.tbl_21_tecnico(id_tecnico_21)
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE public.tbl_36_llanta
  ADD COLUMN IF NOT EXISTS codigo_36 varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS activo_36 bool DEFAULT true NOT NULL;

UPDATE public.tbl_36_llanta
SET codigo_36 = 'LLA-' || LPAD(id_llanta_36::text, 4, '0')
WHERE codigo_36 IS NULL OR BTRIM(codigo_36) = '';

CREATE OR REPLACE FUNCTION public.generar_codigo_llanta_36()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo_36 IS NULL OR BTRIM(NEW.codigo_36) = '' THEN
    NEW.codigo_36 := 'LLA-' || LPAD(NEW.id_llanta_36::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generar_codigo_llanta_36 ON public.tbl_36_llanta;
CREATE TRIGGER trigger_generar_codigo_llanta_36
  BEFORE INSERT ON public.tbl_36_llanta
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_codigo_llanta_36();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_36_codigo'
  ) THEN
    ALTER TABLE public.tbl_36_llanta
      ADD CONSTRAINT uk_tbl_36_codigo UNIQUE (codigo_36);
  END IF;
END $$;

SELECT 'tbl_31' AS tabla, COUNT(*) AS filas FROM public.tbl_31_neumatico
UNION ALL
SELECT 'tbl_32', COUNT(*) FROM public.tbl_32_marca_neumatico
UNION ALL
SELECT 'tbl_33', COUNT(*) FROM public.tbl_33_estado_neumatico
UNION ALL
SELECT 'tbl_34', COUNT(*) FROM public.tbl_34_historial_neumatico
UNION ALL
SELECT 'tbl_36', COUNT(*) FROM public.tbl_36_llanta;
