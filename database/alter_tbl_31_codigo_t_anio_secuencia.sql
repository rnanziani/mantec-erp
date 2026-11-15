-- N° Fuego: T + año (2 dígitos) + secuencia sin ceros.
-- 2026: T261, T262, ... T2612. 2027: T271, T272, ... hasta el 31-12-2027.
-- T = Transantin. La ventana de marcado es chica: sin TS- ni ceros a la izquierda.
-- Los TS-000226 actuales no se convierten.
-- En DBeaver: Alt+X (Execute SQL Script). No uses Ctrl+Enter.

SELECT 1 AS codigo_t_anio_inicio;

ALTER TABLE public.tbl_31_neumatico
  ALTER COLUMN cod_neumatico_31 TYPE varchar(20);

ALTER TABLE public.tbl_34_historial_neumatico
  ALTER COLUMN cod_neumatico_34 TYPE varchar(20);

ALTER TABLE public.tbl_31_neumatico
  ADD COLUMN IF NOT EXISTS codigo_proveedor_31 varchar(30),
  ADD COLUMN IF NOT EXISTS modelo_31 varchar(40),
  ADD COLUMN IF NOT EXISTS medida_31 varchar(30);

COMMENT ON COLUMN public.tbl_31_neumatico.cod_neumatico_31 IS
  'N° Fuego: T + YY + secuencia (T261). Identidad de la cubierta.';
COMMENT ON COLUMN public.tbl_31_neumatico.codigo_proveedor_31 IS
  'Código de ítem del proveedor (ej. 5202). Puede repetirse en el lote.';
COMMENT ON COLUMN public.tbl_31_neumatico.modelo_31 IS
  'Modelo del Excel (ej. R152).';
COMMENT ON COLUMN public.tbl_31_neumatico.medida_31 IS
  'Medida completa (ej. 315/80 R22.5). No reemplaza diametro_32.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_31_cod_neumatico'
  ) THEN
    ALTER TABLE public.tbl_31_neumatico
      ADD CONSTRAINT uk_tbl_31_cod_neumatico UNIQUE (cod_neumatico_31);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tbl_31_codigo_proveedor
  ON public.tbl_31_neumatico (codigo_proveedor_31);

CREATE OR REPLACE FUNCTION public.generar_codigo_neumatico_31()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  yy text;
  prefijo text;
  max_seq int;
  id_nuevo int;
  fuego text;
BEGIN
  IF NEW.id_estado_31 IS NULL THEN
    SELECT e.id_estado_33 INTO id_nuevo
    FROM public.tbl_33_estado_neumatico e
    WHERE UPPER(TRIM(e.estado_33)) = 'NUEVO'
    LIMIT 1;
    NEW.id_estado_31 := id_nuevo;
  END IF;

  fuego := UPPER(BTRIM(COALESCE(NEW.cod_neumatico_31, '')));

  -- Excel / alta a mano: respeta T26 + secuencia (sin ceros).
  IF fuego <> '' THEN
    IF fuego !~ '^T[0-9]{2}[0-9]+$' THEN
      RAISE EXCEPTION 'El N° Fuego debe ser T + año + secuencia (ej. T261, T2612), sin guion ni ceros a la izquierda';
    END IF;
    NEW.cod_neumatico_31 := fuego;
    RETURN NEW;
  END IF;

  yy := to_char(COALESCE(NEW.fecha_ingreso_31, CURRENT_DATE), 'YY');
  prefijo := 'T' || yy;
  PERFORM pg_advisory_xact_lock(310031, EXTRACT(YEAR FROM COALESCE(NEW.fecha_ingreso_31, CURRENT_DATE))::int);

  SELECT COALESCE(MAX(SUBSTRING(n.cod_neumatico_31 FROM 4)::int), 0)
  INTO max_seq
  FROM public.tbl_31_neumatico n
  WHERE n.cod_neumatico_31 ~ ('^T' || yy || '[0-9]+$');

  NEW.cod_neumatico_31 := prefijo || (max_seq + 1)::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generar_codigo_neumatico_31 ON public.tbl_31_neumatico;
CREATE TRIGGER trigger_generar_codigo_neumatico_31
  BEFORE INSERT ON public.tbl_31_neumatico
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_codigo_neumatico_31();

SELECT 'tbl_31_columnas' AS chequeo, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tbl_31_neumatico'
  AND column_name IN ('cod_neumatico_31', 'codigo_proveedor_31', 'modelo_31', 'medida_31')
ORDER BY column_name;
