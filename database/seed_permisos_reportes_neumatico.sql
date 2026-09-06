-- Permiso de reportes de neumaticos (duracion + danos por conductor)
-- En DBeaver: Alt+X. Asigna a rnanziani y a niveles que ya tienen MENU_NEUMATICOS.

INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_NEUMATICOS_REPORTES', 'Reportes de neumaticos (duracion y danos)', 4110)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET descripcion_05 = v.descripcion, orden_05 = v.orden
FROM (VALUES
  ('MENU_NEUMATICOS_REPORTES', 'Reportes de neumaticos (duracion y danos)', 4110)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT u.id_usuario_00, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND p.nombre_permiso_05 = 'MENU_NEUMATICOS_REPORTES'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso up
    WHERE up.id_usuario_000 = u.id_usuario_00
      AND up.id_permiso_000 = p.id_permiso_05
  );

INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT DISTINCT np.id_nivel_04, p.id_permiso_05
FROM tbl_050_nivel_permiso np
JOIN tbl_05_permiso po ON po.id_permiso_05 = np.id_permiso_05
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_NEUMATICOS'
  AND p.nombre_permiso_05 = 'MENU_NEUMATICOS_REPORTES'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso x
    WHERE x.id_nivel_04 = np.id_nivel_04
      AND x.id_permiso_05 = p.id_permiso_05
  );

SELECT id_permiso_05, nombre_permiso_05, orden_05
FROM tbl_05_permiso
WHERE nombre_permiso_05 = 'MENU_NEUMATICOS_REPORTES';
