-- Diagnóstico + reparación stock HER-0017 (banquillo)
-- Ejecutar en PostgreSQL de producción (paso a paso).

-- ========== 1) Estado actual de la herramienta ==========
SELECT
  idherramienta_48,
  codigo_48,
  nombre_48,
  estado_48,
  stock_48,
  stock_disponible_48,
  activo_48
FROM tbl_48_d_herramienta
WHERE codigo_48 = 'HER-0017';

-- ========== 2) Movimientos que la involucran ==========
SELECT
  m.idmpanol_49,
  m.folio_49,
  m.tipomovimiento_49,
  m.estado_49,
  d.cantidad_50,
  d.estadodevolucion_50,
  m.fecha_49
FROM tbl_49_m_panol m
JOIN tbl_50_d_panol d ON d.idmpanol_50 = m.idmpanol_49
JOIN tbl_48_d_herramienta h ON h.idherramienta_48 = d.idherramienta_50
WHERE h.codigo_48 = 'HER-0017'
  AND UPPER(TRIM(m.estado_49)) <> 'ANULADA'
ORDER BY m.fecha_49 DESC, m.idmpanol_49 DESC;

-- ========== 3) Neto prestado (SALIDA - DEVOLUCION) ==========
SELECT
  h.codigo_48,
  COALESCE(SUM(
    CASE
      WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA' THEN d.cantidad_50
      WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'DEVOLUCION' THEN -d.cantidad_50
      ELSE 0
    END
  ), 0) AS neto_prestado
FROM tbl_48_d_herramienta h
LEFT JOIN tbl_50_d_panol d ON d.idherramienta_50 = h.idherramienta_48
LEFT JOIN tbl_49_m_panol m
  ON m.idmpanol_49 = d.idmpanol_50
 AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')
WHERE h.codigo_48 = 'HER-0017'
GROUP BY h.codigo_48;

-- ========== 4) REPARACIÓN FORZADA (solo si quieres dejarlo DISPONIBLE ya) ==========
-- Úsalo si el neto debería ser 0 o si vas a devolver por pantalla después
-- y necesitas el stock alineado. Ajusta stock_48 si no es 1.

UPDATE tbl_48_d_herramienta h
SET
  stock_disponible_48 = h.stock_48,  -- vuelve todo el stock
  estado_48 = 'DISPONIBLE',
  actualizado_en = CURRENT_TIMESTAMP
WHERE h.codigo_48 = 'HER-0017';

-- ========== 5) Verificar ==========
SELECT codigo_48, estado_48, stock_48, stock_disponible_48
FROM tbl_48_d_herramienta
WHERE codigo_48 = 'HER-0017';
