-- Formato de etiqueta persistido. Sugerido = LEN(codigo); se puede subir de rollo.
-- En DBeaver, sobre la BD de etiquetas: Alt+X. Idempotente.

ALTER TABLE public.tbl_89_codigo_etiqueta
  ADD COLUMN IF NOT EXISTS tamano_89 varchar(8);

UPDATE public.tbl_89_codigo_etiqueta
SET tamano_89 = CASE
  WHEN CHAR_LENGTH(TRIM(BOTH FROM codigo_89)) <= 8 THEN '32x20'
  WHEN CHAR_LENGTH(TRIM(BOTH FROM codigo_89)) <= 14 THEN '50x30'
  ELSE '100x30'
END
WHERE tamano_89 IS NULL OR btrim(tamano_89) = '';

ALTER TABLE public.tbl_89_codigo_etiqueta
  ALTER COLUMN tamano_89 SET DEFAULT '32x20';

ALTER TABLE public.tbl_89_codigo_etiqueta
  ALTER COLUMN tamano_89 SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tbl_89_tamano'
  ) THEN
    ALTER TABLE public.tbl_89_codigo_etiqueta
      ADD CONSTRAINT chk_tbl_89_tamano
      CHECK (tamano_89 IN ('32x20', '50x30', '100x30'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tbl_89_tamano
  ON public.tbl_89_codigo_etiqueta (tamano_89);

COMMENT ON COLUMN public.tbl_89_codigo_etiqueta.tamano_89 IS
  'Rollo EPL: 32x20, 50x30 o 100x30. Sugerido por largo del código; se puede elegir uno más grande.';
