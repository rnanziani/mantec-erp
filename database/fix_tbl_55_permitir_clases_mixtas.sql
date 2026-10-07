-- Permite EPP y Ropa de Trabajo en la misma acta.
-- En DBeaver (producción): seleccionar todo y Alt+X.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE c.relname = 'tbl_55_d_entrega_epp'
      AND NOT t.tgisinternal
      AND (
        pg_get_functiondef(p.oid) ILIKE '%no pertenece a la clase%'
        OR (
          pg_get_functiondef(p.oid) ILIKE '%idclase_54%'
          AND pg_get_functiondef(p.oid) ILIKE '%RAISE%'
        )
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.tbl_55_d_entrega_epp', r.tgname);
  END LOOP;
END $$;
