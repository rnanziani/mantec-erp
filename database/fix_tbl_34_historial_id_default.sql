-- Si al grabar trazabilidad falla el historial (id_historial_34 sin correlativo),
-- o quedó el UNIQUE viejo por neumático en el acta: Alt+X en DBeaver (toda la ventana).

SELECT 1 AS fix_tbl_34_historial_inicio;

DO $$
DECLARE
  seq_name text;
  has_identity boolean;
  has_default boolean;
BEGIN
  SELECT a.attidentity <> '' INTO has_identity
    FROM pg_attribute a
   WHERE a.attrelid = 'public.tbl_34_historial_neumatico'::regclass
     AND a.attname = 'id_historial_34';

  IF COALESCE(has_identity, false) THEN
    RETURN;
  END IF;

  seq_name := pg_get_serial_sequence('public.tbl_34_historial_neumatico', 'id_historial_34');
  IF seq_name IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'tbl_34_historial_neumatico_id_historial_34_seq'
    ) THEN
      CREATE SEQUENCE public.tbl_34_historial_neumatico_id_historial_34_seq;
    END IF;
    seq_name := 'public.tbl_34_historial_neumatico_id_historial_34_seq';
  END IF;

  PERFORM setval(
    seq_name::regclass,
    GREATEST(1, COALESCE((SELECT MAX(id_historial_34) FROM public.tbl_34_historial_neumatico), 1)),
    true
  );

  SELECT a.atthasdef INTO has_default
    FROM pg_attribute a
   WHERE a.attrelid = 'public.tbl_34_historial_neumatico'::regclass
     AND a.attname = 'id_historial_34';

  IF NOT COALESCE(has_default, false) THEN
    EXECUTE format(
      'ALTER TABLE public.tbl_34_historial_neumatico ALTER COLUMN id_historial_34 SET DEFAULT nextval(%L::regclass)',
      seq_name
    );
    BEGIN
      EXECUTE format(
        'ALTER SEQUENCE %s OWNED BY public.tbl_34_historial_neumatico.id_historial_34',
        seq_name
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.tbl_77_d_montaje_neumatico
  DROP CONSTRAINT IF EXISTS uk_tbl_77_neu;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_tbl_77_acta_posicion') THEN
    ALTER TABLE public.tbl_77_d_montaje_neumatico
      DROP CONSTRAINT IF EXISTS uk_tbl_77_pos;
  END IF;
END $$;

SELECT a.attname,
       a.attidentity,
       pg_get_expr(d.adbin, d.adrelid) AS def
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
 WHERE a.attrelid = 'public.tbl_34_historial_neumatico'::regclass
   AND a.attname = 'id_historial_34';

SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
 WHERE conrelid = 'public.tbl_77_d_montaje_neumatico'::regclass
   AND contype = 'u'
 ORDER BY conname;
