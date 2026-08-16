-- Permiso MENU_EPP_CLASES + actualizar descripciones del módulo
-- Ejecutar en local y producción después de crear tbl_56.

INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_EPP',            'Acceso al menú Entrega de EPP / Ropa de Trabajo', 9000),
  ('MENU_EPP_CLASES',     'CRUD clases de elemento (EPP / Ropa de Trabajo)', 9005),
  ('MENU_EPP_TIPOS',      'CRUD tipos de elemento (EPP / Ropa de Trabajo)', 9010),
  ('MENU_EPP_CATEGORIAS', 'CRUD categorías de elemento (EPP / Ropa de Trabajo)', 9020),
  ('MENU_EPP_ELEMENTOS',  'CRUD catálogo de elementos (EPP / Ropa de Trabajo)', 9030),
  ('MENU_EPP_ENTREGAS',   'Registro de entregas de EPP / Ropa de Trabajo', 9040)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET
  descripcion_05 = v.descripcion,
  orden_05 = v.orden
FROM (VALUES
  ('MENU_EPP',            'Acceso al menú Entrega de EPP / Ropa de Trabajo', 9000),
  ('MENU_EPP_CLASES',     'CRUD clases de elemento (EPP / Ropa de Trabajo)', 9005),
  ('MENU_EPP_TIPOS',      'CRUD tipos de elemento (EPP / Ropa de Trabajo)', 9010),
  ('MENU_EPP_CATEGORIAS', 'CRUD categorías de elemento (EPP / Ropa de Trabajo)', 9020),
  ('MENU_EPP_ELEMENTOS',  'CRUD catálogo de elementos (EPP / Ropa de Trabajo)', 9030),
  ('MENU_EPP_ENTREGAS',   'Registro de entregas de EPP / Ropa de Trabajo', 9040)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

-- Asignar MENU_EPP_CLASES al usuario (ajusta el email si corresponde)
INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT u.id_usuario_00, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND p.nombre_permiso_05 = 'MENU_EPP_CLASES'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso up
    WHERE up.id_usuario_000 = u.id_usuario_00
      AND up.id_permiso_000 = p.id_permiso_05
  );

-- También al nivel del usuario
INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT u.id_nivel_04, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND u.id_nivel_04 IS NOT NULL
  AND p.nombre_permiso_05 = 'MENU_EPP_CLASES'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso np
    WHERE np.id_nivel_04 = u.id_nivel_04
      AND np.id_permiso_05 = p.id_permiso_05
  );
