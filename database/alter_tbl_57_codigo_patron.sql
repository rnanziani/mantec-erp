-- Refuerza patrón de código TIPO-### en tbl_57 (tablas ya creadas)
-- Ejemplos válidos: ALT-001, BOM-002, RAD-015

ALTER TABLE public.tbl_57_repuesto_danado
  DROP CONSTRAINT IF EXISTS chk_tbl_57_codigo_patron;

ALTER TABLE public.tbl_57_repuesto_danado
  ADD CONSTRAINT chk_tbl_57_codigo_patron CHECK (
    codigo_57 IS NULL OR codigo_57 ~ '^[A-Z]{2,10}-[0-9]{3,6}$'
  );
