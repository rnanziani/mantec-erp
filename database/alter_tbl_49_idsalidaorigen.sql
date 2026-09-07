-- Pañol: liga formal DEVOLUCION → SALIDA (además de la observación con el folio).
-- Ejecutar en PostgreSQL local y Render (Alt+X). El backend funciona sin esta columna;
-- con ella el pendiente deja de depender solo del texto de observación.

ALTER TABLE public.tbl_49_m_panol
  ADD COLUMN IF NOT EXISTS idsalidaorigen_49 int4 NULL;

CREATE INDEX IF NOT EXISTS idx_tbl_49_salida_origen
  ON public.tbl_49_m_panol (idsalidaorigen_49);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tbl_49_salida_origen'
  ) THEN
    ALTER TABLE public.tbl_49_m_panol
      ADD CONSTRAINT fk_tbl_49_salida_origen
      FOREIGN KEY (idsalidaorigen_49)
      REFERENCES public.tbl_49_m_panol (idmpanol_49)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Completar origen en devoluciones viejas que mencionan el folio en la observación
UPDATE tbl_49_m_panol d
SET idsalidaorigen_49 = s.idmpanol_49
FROM tbl_49_m_panol s
WHERE d.idsalidaorigen_49 IS NULL
  AND UPPER(TRIM(d.tipomovimiento_49)) = 'DEVOLUCION'
  AND UPPER(TRIM(s.tipomovimiento_49)) = 'SALIDA'
  AND s.folio_49 IS NOT NULL
  AND TRIM(s.folio_49) <> ''
  AND d.observacion_49 ILIKE '%' || s.folio_49 || '%';
