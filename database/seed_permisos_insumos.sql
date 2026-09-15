-- Permisos módulo Insumos (rango 12000)
-- En DBeaver: Alt+X. Idempotente.
-- Copia acceso desde Operaciones / Mantenedores para no cortar pantallas ya asignadas.

INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
SELECT v.nombre, v.descripcion, v.orden
FROM (VALUES
  ('MENU_INSUMOS',            'Acceso al menú Insumos', 12000),
  ('MENU_INSUMOS_ASIGNACION', 'Asignación de insumos a trabajadores', 12010),
  ('MENU_INSUMOS_CATALOGO',   'CRUD catálogo de insumos', 12020),
  ('MENU_INSUMOS_MARCAS',     'CRUD marca de insumo', 12030)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_05_permiso p WHERE p.nombre_permiso_05 = v.nombre
);

UPDATE tbl_05_permiso p
SET descripcion_05 = v.descripcion, orden_05 = v.orden
FROM (VALUES
  ('MENU_INSUMOS',            'Acceso al menú Insumos', 12000),
  ('MENU_INSUMOS_ASIGNACION', 'Asignación de insumos a trabajadores', 12010),
  ('MENU_INSUMOS_CATALOGO',   'CRUD catálogo de insumos', 12020),
  ('MENU_INSUMOS_MARCAS',     'CRUD marca de insumo', 12030)
) AS v(nombre, descripcion, orden)
WHERE p.nombre_permiso_05 = v.nombre;

-- Super Admin (nivel 1)
INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT 1, p.id_permiso_05
FROM tbl_05_permiso p
WHERE p.nombre_permiso_05 LIKE 'MENU_INSUMOS%'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso np
    WHERE np.id_nivel_04 = 1
      AND np.id_permiso_05 = p.id_permiso_05
  );

-- Usuario de referencia
INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT u.id_usuario_00, p.id_permiso_05
FROM tbl_00_usuario u
CROSS JOIN tbl_05_permiso p
WHERE LOWER(u.email) = LOWER('rnanziani@gmail.com')
  AND p.nombre_permiso_05 LIKE 'MENU_INSUMOS%'
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
  AND p.nombre_permiso_05 LIKE 'MENU_INSUMOS%'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso np
    WHERE np.id_nivel_04 = u.id_nivel_04
      AND np.id_permiso_05 = p.id_permiso_05
  );

-- Quien tenía Operaciones veía Asignación de insumos (permiso padre).
INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT DISTINCT np.id_nivel_04, p.id_permiso_05
FROM tbl_050_nivel_permiso np
JOIN tbl_05_permiso po ON po.id_permiso_05 = np.id_permiso_05
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_OPERACIONES'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_ASIGNACION')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso x
    WHERE x.id_nivel_04 = np.id_nivel_04
      AND x.id_permiso_05 = p.id_permiso_05
  );

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT DISTINCT up.id_usuario_000, p.id_permiso_05
FROM tbl_000_usuario_permiso up
JOIN tbl_05_permiso po ON po.id_permiso_05 = up.id_permiso_000
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_OPERACIONES'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_ASIGNACION')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso x
    WHERE x.id_usuario_000 = up.id_usuario_000
      AND x.id_permiso_000 = p.id_permiso_05
  );

-- Catálogo de insumos (antes Mantenedores)
INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT DISTINCT np.id_nivel_04, p.id_permiso_05
FROM tbl_050_nivel_permiso np
JOIN tbl_05_permiso po ON po.id_permiso_05 = np.id_permiso_05
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_MANTENEDORES_INSUMOS'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_CATALOGO')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso x
    WHERE x.id_nivel_04 = np.id_nivel_04
      AND x.id_permiso_05 = p.id_permiso_05
  );

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT DISTINCT up.id_usuario_000, p.id_permiso_05
FROM tbl_000_usuario_permiso up
JOIN tbl_05_permiso po ON po.id_permiso_05 = up.id_permiso_000
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_MANTENEDORES_INSUMOS'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_CATALOGO')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso x
    WHERE x.id_usuario_000 = up.id_usuario_000
      AND x.id_permiso_000 = p.id_permiso_05
  );

-- Marca de insumo (antes Mantenedores)
INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
SELECT DISTINCT np.id_nivel_04, p.id_permiso_05
FROM tbl_050_nivel_permiso np
JOIN tbl_05_permiso po ON po.id_permiso_05 = np.id_permiso_05
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_MANTENEDORES_MARCAS_INSUMO'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_MARCAS')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_050_nivel_permiso x
    WHERE x.id_nivel_04 = np.id_nivel_04
      AND x.id_permiso_05 = p.id_permiso_05
  );

INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
SELECT DISTINCT up.id_usuario_000, p.id_permiso_05
FROM tbl_000_usuario_permiso up
JOIN tbl_05_permiso po ON po.id_permiso_05 = up.id_permiso_000
CROSS JOIN tbl_05_permiso p
WHERE po.nombre_permiso_05 = 'MENU_MANTENEDORES_MARCAS_INSUMO'
  AND p.nombre_permiso_05 IN ('MENU_INSUMOS', 'MENU_INSUMOS_MARCAS')
  AND NOT EXISTS (
    SELECT 1 FROM tbl_000_usuario_permiso x
    WHERE x.id_usuario_000 = up.id_usuario_000
      AND x.id_permiso_000 = p.id_permiso_05
  );
