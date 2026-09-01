-- HER-0017: anular salidas abiertas que ya no deben comprometer stock
-- (el banquillo está DISPONIBLE en catálogo pero el histórico aún cuenta 1 prestado).
-- Ejecutar en PostgreSQL.

-- 1) Ver salidas pendientes/comprometidas del banquillo
SELECT
  m.idmpanol_49,
  m.folio_49,
  m.tipomovimiento_49,
  m.estado_49,
  d.cantidad_50,
  m.fecha_49
FROM tbl_49_m_panol m
JOIN tbl_50_d_panol d ON d.idmpanol_50 = m.idmpanol_49
JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
WHERE h.codigo_48 = 'HER-0017'
  AND UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA'
  AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')
ORDER BY m.idmpanol_49 DESC;

-- 2) Anular salidas PENDIENTE huérfanas de HER-0017
--    (cuando la herramienta YA está DISPONIBLE con stock)
UPDATE tbl_49_m_panol m
SET
  estado_49 = 'ANULADA',
  observacion_49 = TRIM(BOTH FROM CONCAT(
    COALESCE(m.observacion_49, ''),
    CASE WHEN COALESCE(TRIM(m.observacion_49), '') = '' THEN '' ELSE ' | ' END,
    'Anulación admin: stock ya restaurado manualmente (HER-0017)'
  )),
  actualizado_en = CURRENT_TIMESTAMP
WHERE UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA'
  AND UPPER(TRIM(m.estado_49)) = 'PENDIENTE'
  AND EXISTS (
    SELECT 1
    FROM tbl_50_d_panol d
    JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
    WHERE d.idmpanol_50 = m.idmpanol_49
      AND h.codigo_48 = 'HER-0017'
      AND UPPER(TRIM(h.estado_48)) = 'DISPONIBLE'
      AND h.stock_disponible_48 >= 1
  );

-- 3) Asegurar catálogo
UPDATE tbl_48_d_herramienta
SET
  stock_disponible_48 = stock_48,
  estado_48 = 'DISPONIBLE',
  actualizado_en = CURRENT_TIMESTAMP
WHERE codigo_48 = 'HER-0017';

-- 4) Verificar
SELECT codigo_48, estado_48, stock_48, stock_disponible_48
FROM tbl_48_d_herramienta
WHERE codigo_48 = 'HER-0017';

SELECT idmpanol_49, folio_49, tipomovimiento_49, estado_49
FROM tbl_49_m_panol m
WHERE EXISTS (
  SELECT 1 FROM tbl_50_d_panol d
  JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
  WHERE d.idmpanol_50 = m.idmpanol_49 AND h.codigo_48 = 'HER-0017'
)
ORDER BY idmpanol_49 DESC
LIMIT 10;
