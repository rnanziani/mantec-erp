-- Desbloquea entregas EPP con estado NUEVO/A y evita que un folio raro tumbe el alta.
-- En DBeaver, conectado a PRODUCCIÓN: seleccionar todo y Alt+X.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tbl_55_d_entrega_epp'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%estadoentrega_55%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.tbl_55_d_entrega_epp DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

UPDATE public.tbl_55_d_entrega_epp
SET estadoentrega_55 = CASE upper(estadoentrega_55)
  WHEN 'BUENA' THEN 'BUENO/A'
  WHEN 'REGULAR' THEN 'USADO/A'
  WHEN 'DANADA' THEN 'DAÑADO/A'
  WHEN 'DAÑADA' THEN 'DAÑADO/A'
  WHEN 'NUEVO' THEN 'NUEVO/A'
  ELSE estadoentrega_55
END;

ALTER TABLE public.tbl_55_d_entrega_epp
  ADD CONSTRAINT chk_tbl_55_estado_entrega_valido
  CHECK (estadoentrega_55 IN ('NUEVO/A', 'BUENO/A', 'USADO/A', 'DAÑADO/A'));

CREATE OR REPLACE FUNCTION fn_generar_folio_epp_54() RETURNS TRIGGER AS $$
DECLARE
    v_anio varchar(4);
    v_consecutivo int4;
    v_folio varchar(30);
BEGIN
    IF NEW.folio_54 IS NULL OR TRIM(NEW.folio_54) = '' THEN
        v_anio := EXTRACT(YEAR FROM NEW.fecha_entrega_54)::varchar;
        SELECT COALESCE(MAX(
          CASE
            WHEN SPLIT_PART(folio_54, '-', 3) ~ '^[0-9]+$'
            THEN CAST(SPLIT_PART(folio_54, '-', 3) AS int4)
            ELSE 0
          END
        ), 0) + 1
        INTO v_consecutivo
        FROM tbl_54_m_entrega_epp
        WHERE folio_54 LIKE 'EPP-' || v_anio || '-%';
        v_folio := 'EPP-' || v_anio || '-' || LPAD(v_consecutivo::varchar, 4, '0');
        NEW.folio_54 := v_folio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
