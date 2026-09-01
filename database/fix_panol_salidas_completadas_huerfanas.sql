-- Reparar salidas COMPLETADA “huérfanas”: herramienta sigue PRESTADA / sin stock
-- (caso típico: se marcó COMPLETADA a mano sin hacer devolución).
-- Ejecutar en PostgreSQL de producción.

-- 1) Ver el problema (banquillo HER-0017 / SAL-2026-0008)
SELECT
  m.idmpanol_49,
  m.folio_49,
  m.tipomovimiento_49,
  m.estado_49,
  h.codigo_48,
  h.nombre_48,
  h.estado_48,
  h.stock_48,
  h.stock_disponible_48
FROM tbl_49_m_panol m
JOIN tbl_50_d_panol d ON d.idmpanol_50 = m.idmpanol_49
JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
WHERE h.codigo_48 = 'HER-0017'
ORDER BY m.idmpanol_49 DESC;

-- 2) Reabrir salidas COMPLETADA cuya herramienta sigue prestada (sin stock disponible)
UPDATE tbl_49_m_panol m
SET
  estado_49 = 'PENDIENTE',
  fechadevolucion_49 = NULL,
  actualizado_en = CURRENT_TIMESTAMP
WHERE UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA'
  AND UPPER(TRIM(m.estado_49)) = 'COMPLETADA'
  AND EXISTS (
    SELECT 1
    FROM tbl_50_d_panol d
    JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
    WHERE d.idmpanol_50 = m.idmpanol_49
      AND (
        UPPER(TRIM(h.estado_48)) = 'PRESTADA'
        OR h.stock_disponible_48 < h.stock_48
      )
  );

-- 3) Verificar: deben quedar PENDIENTE y listos para botón Devolver
SELECT idmpanol_49, folio_49, tipomovimiento_49, estado_49
FROM tbl_49_m_panol
WHERE folio_49 = 'SAL-2026-0008';
