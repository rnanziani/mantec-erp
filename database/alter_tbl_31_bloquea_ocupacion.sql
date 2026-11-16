-- T261: una cubierta = una posición (bloquea_ocupacion_31 = true).
-- TSN (sin N° Fuego): el mismo código puede ir a DEL-IZQ y DEL-DER.
-- En DBeaver: Alt+X.

SELECT 1 AS bloquea_ocupacion_inicio;

ALTER TABLE public.tbl_31_neumatico
  ADD COLUMN IF NOT EXISTS bloquea_ocupacion_31 boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.tbl_31_neumatico.bloquea_ocupacion_31 IS
  'true = N° Fuego único, no se monta en dos posiciones. false = código de flota sin fuego; puede repetirse (IZQ y DER).';

UPDATE public.tbl_31_neumatico
   SET bloquea_ocupacion_31 = false
 WHERE UPPER(BTRIM(cod_neumatico_31)) LIKE 'TSN%';

ALTER TABLE public.tbl_77_d_montaje_neumatico
  DROP CONSTRAINT IF EXISTS uk_tbl_77_neu;

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
  v_marca text;
BEGIN
  IF NEW.id_estado_31 IS NULL THEN
    SELECT e.id_estado_33 INTO id_nuevo
    FROM public.tbl_33_estado_neumatico e
    WHERE UPPER(TRIM(e.estado_33)) = 'NUEVO'
    LIMIT 1;
    NEW.id_estado_31 := id_nuevo;
  END IF;

  fuego := UPPER(BTRIM(COALESCE(NEW.cod_neumatico_31, '')));

  IF fuego IN ('TSN', 'SINNUMERO', 'SIN-NUMERO') THEN
    SELECT m.marca_32 INTO v_marca
      FROM public.tbl_32_marca_neumatico m
     WHERE m.id_marca_32 = NEW.id_marca_31;
    prefijo := public.prefijo_tsn_marca_31(v_marca);
    IF prefijo IS NULL THEN
      RAISE EXCEPTION 'Sin N° Fuego solo para AUSTONE, GOODYEAR, MICHELIN o JINYU (TSNAU, TSNGY, TSNMI, TSNJI)';
    END IF;
    PERFORM pg_advisory_xact_lock(310032, hashtext(prefijo));
    SELECT COALESCE(MAX(SUBSTRING(n.cod_neumatico_31 FROM length(prefijo) + 1)::int), 0)
      INTO max_seq
      FROM public.tbl_31_neumatico n
     WHERE n.cod_neumatico_31 ~ ('^' || prefijo || '[0-9]+$');
    NEW.cod_neumatico_31 := prefijo || (max_seq + 1)::text;
    NEW.bloquea_ocupacion_31 := false;
    IF NEW.observaciones_31 IS NULL OR BTRIM(NEW.observaciones_31) = '' THEN
      NEW.observaciones_31 := CASE prefijo
        WHEN 'TSNAU' THEN 'TRANSANTIN SIN NUMERO AUSTONE'
        WHEN 'TSNGY' THEN 'TRANSANTIN SIN NUMERO GOOD YEAR'
        WHEN 'TSNMI' THEN 'TRANSANTIN SIN NUMERO MICHELIN'
        WHEN 'TSNJI' THEN 'TRANSANTIN SIN NUMERO JINYU'
        ELSE NEW.observaciones_31
      END;
    END IF;
    RETURN NEW;
  END IF;

  IF fuego <> '' THEN
    IF fuego !~ '^T[0-9]{2}[0-9]+$'
       AND fuego !~ '^TSN(AU|GY|MI|JI)[0-9]*$' THEN
      RAISE EXCEPTION 'El código debe ser T261 (fábrica) o TSNAU / TSNGY / TSNMI / TSNJI (sin N° Fuego)';
    END IF;
    NEW.cod_neumatico_31 := fuego;
    IF fuego LIKE 'TSN%' THEN
      NEW.bloquea_ocupacion_31 := false;
    END IF;
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

SELECT n.cod_neumatico_31, n.bloquea_ocupacion_31, n.observaciones_31
  FROM public.tbl_31_neumatico n
 WHERE UPPER(BTRIM(n.cod_neumatico_31)) LIKE 'TSN%'
 ORDER BY n.cod_neumatico_31;
