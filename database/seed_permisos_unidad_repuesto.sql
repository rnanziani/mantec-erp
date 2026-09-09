-- Permisos del flujo unidad + movimientos (tbl_81–85)
INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_REPUESTOS_DANADOS_UNIDAD',     'Unidades de repuesto dañado (maestro por pieza)', 9132),
  ('MENU_REPUESTOS_DANADOS_MOVIMIENTO', 'Movimientos del ciclo de reparación', 9134),
  ('MENU_REPUESTOS_DANADOS_STOCK',      'Stock actual de unidades de repuesto', 9136)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET descripcion_05 = v.descripcion, orden_05 = v.orden
FROM (VALUES
  ('MENU_REPUESTOS_DANADOS_UNIDAD',     'Unidades de repuesto dañado (maestro por pieza)', 9132),
  ('MENU_REPUESTOS_DANADOS_MOVIMIENTO', 'Movimientos del ciclo de reparación', 9134),
  ('MENU_REPUESTOS_DANADOS_STOCK',      'Stock actual de unidades de repuesto', 9136)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

-- Quienes ya tienen el menú padre reciben los tres nuevos
INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT DISTINCT up.id_usuario_000, p.id_permiso_05
FROM tbl_000_usuario_permiso up
JOIN tbl_05_permiso parent ON parent.id_permiso_05 = up.id_permiso_000
  AND parent.nombre_permiso_05 = 'MENU_REPUESTOS_DANADOS'
CROSS JOIN tbl_05_permiso p
WHERE p.nombre_permiso_05 IN (
  'MENU_REPUESTOS_DANADOS_UNIDAD',
  'MENU_REPUESTOS_DANADOS_MOVIMIENTO',
  'MENU_REPUESTOS_DANADOS_STOCK'
)
AND NOT EXISTS (
  SELECT 1 FROM tbl_000_usuario_permiso x
  WHERE x.id_usuario_000 = up.id_usuario_000
    AND x.id_permiso_000 = p.id_permiso_05
);

INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT DISTINCT np.id_nivel_04, p.id_permiso_05
FROM tbl_050_nivel_permiso np
JOIN tbl_05_permiso parent ON parent.id_permiso_05 = np.id_permiso_05
  AND parent.nombre_permiso_05 = 'MENU_REPUESTOS_DANADOS'
CROSS JOIN tbl_05_permiso p
WHERE p.nombre_permiso_05 IN (
  'MENU_REPUESTOS_DANADOS_UNIDAD',
  'MENU_REPUESTOS_DANADOS_MOVIMIENTO',
  'MENU_REPUESTOS_DANADOS_STOCK'
)
AND NOT EXISTS (
  SELECT 1 FROM tbl_050_nivel_permiso x
  WHERE x.id_nivel_04 = np.id_nivel_04
    AND x.id_permiso_05 = p.id_permiso_05
);
