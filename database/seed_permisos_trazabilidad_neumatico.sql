-- Permisos nuevos del menu Neumaticos (paso 2)
-- En DBeaver: Alt+X. Asigna a rnanziani y a su nivel.

INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_NEUMATICOS_TRAZABILIDAD', 'Intervencion / trazabilidad de neumaticos', 4070),
  ('MENU_NEUMATICOS_POSICIONES', 'Catalogo de posiciones (L1, R2i, ...)', 4080),
  ('MENU_NEUMATICOS_DANO_NEUMATICO', 'Tipos de dano de neumatico (baja)', 4090),
  ('MENU_NEUMATICOS_DANO_LLANTA', 'Tipos de dano de llanta', 4100)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET descripcion_05 = v.descripcion, orden_05 = v.orden
FROM (VALUES
  ('MENU_NEUMATICOS_TRAZABILIDAD', 'Intervencion / trazabilidad de neumaticos', 4070),
  ('MENU_NEUMATICOS_POSICIONES', 'Catalogo de posiciones (L1, R2i, ...)', 4080),
  ('MENU_NEUMATICOS_DANO_NEUMATICO', 'Tipos de dano de neumatico (baja)', 4090),
  ('MENU_NEUMATICOS_DANO_LLANTA', 'Tipos de dano de llanta', 4100)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT u.id_usuario_00, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND p.nombre_permiso_05 IN (
    'MENU_NEUMATICOS_TRAZABILIDAD',
    'MENU_NEUMATICOS_POSICIONES',
    'MENU_NEUMATICOS_DANO_NEUMATICO',
    'MENU_NEUMATICOS_DANO_LLANTA'
  )
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
  AND p.nombre_permiso_05 IN (
    'MENU_NEUMATICOS_TRAZABILIDAD',
    'MENU_NEUMATICOS_POSICIONES',
    'MENU_NEUMATICOS_DANO_NEUMATICO',
    'MENU_NEUMATICOS_DANO_LLANTA'
  )
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso x
    WHERE x.id_nivel_04 = np.id_nivel_04
      AND x.id_permiso_05 = p.id_permiso_05
  );

-- Verificacion: deben verse 4 filas
SELECT id_permiso_05, nombre_permiso_05, orden_05
FROM tbl_05_permiso
WHERE nombre_permiso_05 IN (
  'MENU_NEUMATICOS_TRAZABILIDAD',
  'MENU_NEUMATICOS_POSICIONES',
  'MENU_NEUMATICOS_DANO_NEUMATICO',
  'MENU_NEUMATICOS_DANO_LLANTA'
)
ORDER BY orden_05;
