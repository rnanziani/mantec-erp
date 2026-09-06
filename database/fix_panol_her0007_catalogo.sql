-- Corrige HER-0007 (y similares) marcadas PRESTADA cuando el neto de
-- movimientos ya es 0 (préstamo cerrado / ya devuelto).
-- Ejecutar en local y Render si el catálogo no coincide con el kardex.

UPDATE tbl_48_d_herramienta h
SET
  stock_disponible_48 = h.stock_48,
  estado_48 = 'DISPONIBLE',
  actualizado_en = CURRENT_TIMESTAMP
WHERE UPPER(TRIM(h.codigo_48)) = 'HER-0007'
  AND UPPER(TRIM(h.estado_48)) = 'PRESTADA'
  AND COALESCE((
    SELECT SUM(
      CASE
        WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'SALIDA' THEN d.cantidad_50
        WHEN UPPER(TRIM(m.tipomovimiento_49)) = 'DEVOLUCION' THEN -d.cantidad_50
        ELSE 0
      END
    )
    FROM tbl_50_d_panol d
    INNER JOIN tbl_49_m_panol m ON m.idmpanol_49 = d.idmpanol_50
    WHERE d.idherramienta_50 = h.idherramienta_48
      AND UPPER(TRIM(m.estado_49)) IN ('PENDIENTE', 'COMPLETADA')
  ), 0) <= 0;

SELECT codigo_48, estado_48, stock_48, stock_disponible_48
FROM tbl_48_d_herramienta
WHERE codigo_48 = 'HER-0007';
