-- Permisos módulo Control de lubricantes
INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_LUBRICANTES',          'Acceso al menú Control de lubricantes', 11000),
  ('MENU_LUBRICANTES_CATALOGO', 'CRUD catálogo de lubricantes', 11010),
  ('MENU_LUBRICANTES_CONSUMO',  'Registro de consumo de lubricantes', 11020)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET descripcion_05 = v.descripcion, orden_05 = v.orden
FROM (VALUES
  ('MENU_LUBRICANTES',          'Acceso al menú Control de lubricantes', 11000),
  ('MENU_LUBRICANTES_CATALOGO', 'CRUD catálogo de lubricantes', 11010),
  ('MENU_LUBRICANTES_CONSUMO',  'Registro de consumo de lubricantes', 11020)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT u.id_usuario_00, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND p.nombre_permiso_05 LIKE 'MENU_LUBRICANTES%'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso up
    WHERE up.id_usuario_000 = u.id_usuario_00
      AND up.id_permiso_000 = p.id_permiso_05
  );

INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT u.id_nivel_04, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND u.id_nivel_04 IS NOT NULL
  AND p.nombre_permiso_05 LIKE 'MENU_LUBRICANTES%'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso np
    WHERE np.id_nivel_04 = u.id_nivel_04
      AND np.id_permiso_05 = p.id_permiso_05
  );
