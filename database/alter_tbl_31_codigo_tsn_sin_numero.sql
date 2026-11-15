-- Cubiertas de flota sin N° Fuego de fábrica.
-- TSN + marca + secuencia (sin ceros):
--   TSNAU1 = TRANSANTIN SIN NUMERO AUSTONE
--   TSNGY1 = TRANSANTIN SIN NUMERO GOOD YEAR
--   TSNMI1 = TRANSANTIN SIN NUMERO MICHELIN
--   TSNJI1 = TRANSANTIN SIN NUMERO JINYU
-- El 1, 2, 3… es la cubierta, no la marca. T261 del proveedor no se toca.
-- Alta: enviar código TSN (el trigger completa TSNAU1, TSNGY1…).
-- En DBeaver: Alt+X.

SELECT 1 AS codigo_tsn_sin_numero_inicio;

CREATE OR REPLACE FUNCTION public.prefijo_tsn_marca_31(p_marca text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE regexp_replace(upper(trim(COALESCE(p_marca, ''))), '[^A-Z]', '', 'g')
    WHEN 'AUSTONE'  THEN 'TSNAU'
    WHEN 'GOODYEAR' THEN 'TSNGY'
    WHEN 'MICHELIN' THEN 'TSNMI'
    WHEN 'JINYU'    THEN 'TSNJI'
    ELSE NULL
  END;
$$;

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
    IF fuego !~ '^T[0-9]{2}[0-9]+$' AND fuego !~ '^TSN(AU|GY|MI|JI)[0-9]+$' THEN
      RAISE EXCEPTION 'El código debe ser T261 (fábrica) o TSNAU1 / TSNGY1 / TSNMI1 / TSNJI1 (sin N° Fuego)';
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

SELECT public.prefijo_tsn_marca_31('AUSTONE')  AS austone,
       public.prefijo_tsn_marca_31('GOOD YEAR') AS goodyear,
       public.prefijo_tsn_marca_31('MICHELIN') AS michelin,
       public.prefijo_tsn_marca_31('JINYU')    AS jinyu;

-- El combo de trazabilidad lista filas de tbl_31. Sin estas cubiertas no aparece TSN.
WITH marcas_tsn AS (
  SELECT DISTINCT ON (public.prefijo_tsn_marca_31(m.marca_32))
         m.id_marca_32,
         public.prefijo_tsn_marca_31(m.marca_32) AS prefijo,
         m.marca_32
    FROM public.tbl_32_marca_neumatico m
   WHERE m.estado_32 = true
     AND public.prefijo_tsn_marca_31(m.marca_32) IS NOT NULL
   ORDER BY public.prefijo_tsn_marca_31(m.marca_32),
            CASE WHEN m.diametro_32 = 315 THEN 0 ELSE 1 END,
            m.id_marca_32
),
codigos AS (
  SELECT * FROM (VALUES
    ('TSNAU', 'TSNAU1', 'TRANSANTIN SIN NUMERO AUSTONE'),
    ('TSNGY', 'TSNGY1', 'TRANSANTIN SIN NUMERO GOOD YEAR'),
    ('TSNMI', 'TSNMI1', 'TRANSANTIN SIN NUMERO MICHELIN'),
    ('TSNJI', 'TSNJI1', 'TRANSANTIN SIN NUMERO JINYU')
  ) AS x(prefijo, codigo, leyenda)
)
INSERT INTO public.tbl_31_neumatico (
  id_marca_31, cod_neumatico_31, observaciones_31, fecha_ingreso_31
)
SELECT m.id_marca_32, c.codigo, c.leyenda, CURRENT_DATE
  FROM codigos c
  JOIN marcas_tsn m ON m.prefijo = c.prefijo
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.tbl_31_neumatico n
    WHERE n.cod_neumatico_31 = c.codigo
 );

SELECT c.codigo,
       c.leyenda,
       CASE WHEN m.prefijo IS NULL THEN 'Falta la marca en el catálogo (Neumáticos → Marcas)'
            ELSE 'OK'
       END AS marca_catalogo
  FROM (VALUES
    ('TSNAU', 'TSNAU1', 'TRANSANTIN SIN NUMERO AUSTONE'),
    ('TSNGY', 'TSNGY1', 'TRANSANTIN SIN NUMERO GOOD YEAR'),
    ('TSNMI', 'TSNMI1', 'TRANSANTIN SIN NUMERO MICHELIN'),
    ('TSNJI', 'TSNJI1', 'TRANSANTIN SIN NUMERO JINYU')
  ) AS c(prefijo, codigo, leyenda)
  LEFT JOIN (
    SELECT DISTINCT public.prefijo_tsn_marca_31(marca_32) AS prefijo
      FROM public.tbl_32_marca_neumatico
     WHERE estado_32 = true
  ) m ON m.prefijo = c.prefijo
 ORDER BY c.codigo;

SELECT n.cod_neumatico_31, mk.marca_32, e.estado_33, n.observaciones_31
  FROM public.tbl_31_neumatico n
  LEFT JOIN public.tbl_32_marca_neumatico mk ON mk.id_marca_32 = n.id_marca_31
  LEFT JOIN public.tbl_33_estado_neumatico e ON e.id_estado_33 = n.id_estado_31
 WHERE n.cod_neumatico_31 ~ '^TSN(AU|GY|MI|JI)[0-9]+$'
 ORDER BY n.cod_neumatico_31;
