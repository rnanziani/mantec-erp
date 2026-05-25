/**
 * Mueve Marcas de alternadores de Mantenedores a Gestión Alternadores.
 * Crea MENU_GESTION_ALTERNADORES_MARCAS, migra asignaciones y elimina MENU_MANTENEDORES_MARCAS.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'mantec_erc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const LEGACY = 'MENU_MANTENEDORES_MARCAS';
const NEW_PERM = {
  nombre: 'MENU_GESTION_ALTERNADORES_MARCAS',
  descripcion: 'Marca alternadores',
  orden: 5070,
};

async function getIdByName(nombre) {
  const r = await pool.query(
    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,
    [nombre]
  );
  return r.rows[0]?.id_permiso_05 ?? null;
}

async function assignToNivel(idNivel, idPermiso) {
  await pool.query(
    `INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
     SELECT $1, $2 WHERE NOT EXISTS (
       SELECT 1 FROM tbl_050_nivel_permiso WHERE id_nivel_04 = $1 AND id_permiso_05 = $2
     )`,
    [idNivel, idPermiso]
  );
}

async function assignToUsuario(idUsuario, idPermiso) {
  await pool.query(
    `INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
     SELECT $1, $2 WHERE NOT EXISTS (
       SELECT 1 FROM tbl_000_usuario_permiso WHERE id_usuario_000 = $1 AND id_permiso_000 = $2
     )`,
    [idUsuario, idPermiso]
  );
}

async function main() {
  console.log('=== Migración Marca Alternadores -> Gestión Alternadores ===\n');

  const dup = await pool.query(
    `SELECT nombre_permiso_05, COUNT(*)::int AS cnt
     FROM tbl_05_permiso
     WHERE nombre_permiso_05 IN ($1, $2)
     GROUP BY nombre_permiso_05`,
    [LEGACY, NEW_PERM.nombre]
  );
  console.log('Auditoría previa:', dup.rows);

  let newId = await getIdByName(NEW_PERM.nombre);
  if (newId) {
    await pool.query(
      `UPDATE tbl_05_permiso SET descripcion_05 = $1, orden_05 = $2 WHERE id_permiso_05 = $3`,
      [NEW_PERM.descripcion, NEW_PERM.orden, newId]
    );
    console.log(`Permiso existente actualizado: ${NEW_PERM.nombre} (id ${newId})`);
  } else {
    const ins = await pool.query(
      `INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
       VALUES ($1, $2, $3) RETURNING id_permiso_05`,
      [NEW_PERM.nombre, NEW_PERM.descripcion, NEW_PERM.orden]
    );
    newId = ins.rows[0].id_permiso_05;
    console.log(`Creado: ${NEW_PERM.nombre} (id ${newId}, orden ${NEW_PERM.orden})`);
  }

  const legacyId = await getIdByName(LEGACY);
  if (legacyId) {
    const niveles = await pool.query(
      `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
      [legacyId]
    );
    for (const { id_nivel_04 } of niveles.rows) {
      await assignToNivel(id_nivel_04, newId);
    }

    const usuarios = await pool.query(
      `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
      [legacyId]
    );
    for (const { id_usuario_000 } of usuarios.rows) {
      await assignToUsuario(id_usuario_000, newId);
    }
    console.log(`Migrado: ${LEGACY} -> ${NEW_PERM.nombre} (${niveles.rowCount} niveles, ${usuarios.rowCount} usuarios)`);

    await pool.query(`DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`, [legacyId]);
    await pool.query(`DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`, [legacyId]);
    await pool.query(`DELETE FROM tbl_05_permiso WHERE id_permiso_05 = $1`, [legacyId]);
    console.log(`Eliminado legacy: ${LEGACY} (id ${legacyId})`);
  } else {
    console.log(`Legacy ${LEGACY} no encontrado (ya migrado).`);
  }

  // Super Administrador
  await assignToNivel(1, newId);

  // Niveles con menú padre Gestión Alternadores heredan Marca Alternadores
  const nivelesPadre = await pool.query(
    `SELECT DISTINCT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
     WHERE p.nombre_permiso_05 = 'MENU_GESTION_ALTERNADORES'`
  );
  for (const { id_nivel_04 } of nivelesPadre.rows) {
    await assignToNivel(id_nivel_04, newId);
  }

  const post = await pool.query(
    `SELECT id_permiso_05, nombre_permiso_05, orden_05
     FROM tbl_05_permiso
     WHERE nombre_permiso_05 ILIKE '%MARCAS%' OR descripcion_05 ILIKE '%marca%alternador%'
     ORDER BY orden_05`
  );
  console.log('\n=== Auditoría post-migración (permisos marca/alternador) ===');
  console.table(post.rows);

  const legacyLeft = await getIdByName(LEGACY);
  if (legacyLeft) {
    throw new Error(`Aún existe ${LEGACY} — migración incompleta`);
  }

  const ga = await pool.query(
    `SELECT nombre_permiso_05, orden_05
     FROM tbl_05_permiso
     WHERE orden_05 BETWEEN 5000 AND 5999
     ORDER BY orden_05`
  );
  console.log('\nGestión Alternadores (5000-5999):');
  console.table(ga.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
