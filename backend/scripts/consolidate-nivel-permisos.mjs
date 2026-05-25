/**
 * Consolida permisos MENU_NIVEL_* obsoletos hacia los 9 que usa Sidebar.tsx.
 * Migra tbl_050_nivel_permiso y tbl_000_usuario_permiso, luego elimina del catálogo.
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

/** id obsoleto -> id canónico (Sidebar / App.tsx) */
const MIGRATE = [
  { from: 8, to: 68, note: 'ASIGNACION_NIVELES -> ASIGNACION' },
  { from: 9, to: 68, note: 'PERMISOS_DIRECTOS -> ASIGNACION' },
  { from: 10, to: 69, note: 'HISTORIAL_CONTRASEÑA -> HISTORIAL' },
  { from: 11, to: 70, note: 'INTENTOS_LOGIN -> INTENTOS' },
  { from: 12, to: 71, note: 'SECCIONES -> SESIONES' },
  { from: 13, to: 72, note: 'PARAMETROS_SISTEMA -> PARAMETROS' },
];

/** Sin equivalente en menú: solo quitar asignaciones y borrar */
const DELETE_ONLY = [14]; // MENU_NIVEL_ACCESO_DISPONIBLE

const KEEP_IDS = [65, 66, 67, 7, 68, 69, 70, 71, 72];

async function migrateNivelPermiso(fromId, toId) {
  const rows = await pool.query(
    `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [fromId]
  );
  for (const { id_nivel_04 } of rows.rows) {
    await pool.query(
      `INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM tbl_050_nivel_permiso
         WHERE id_nivel_04 = $1 AND id_permiso_05 = $2
       )`,
      [id_nivel_04, toId]
    );
  }
  const del = await pool.query(
    `DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [fromId]
  );
  return { niveles: rows.rowCount, deleted: del.rowCount };
}

async function migrateUsuarioPermiso(fromId, toId) {
  const rows = await pool.query(
    `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [fromId]
  );
  for (const { id_usuario_000 } of rows.rows) {
    await pool.query(
      `INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM tbl_000_usuario_permiso
         WHERE id_usuario_000 = $1 AND id_permiso_000 = $2
       )`,
      [id_usuario_000, toId]
    );
  }
  const del = await pool.query(
    `DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [fromId]
  );
  return { usuarios: rows.rowCount, deleted: del.rowCount };
}

async function removePermiso(id) {
  await pool.query(`DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`, [id]);
  await pool.query(`DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`, [id]);
  const r = await pool.query(`DELETE FROM tbl_05_permiso WHERE id_permiso_05 = $1 RETURNING nombre_permiso_05`, [id]);
  return r.rows[0]?.nombre_permiso_05;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { from, to, note } of MIGRATE) {
      const n = await migrateNivelPermiso(from, to);
      const u = await migrateUsuarioPermiso(from, to);
      const name = await removePermiso(from);
      console.log(`✓ ${from} -> ${to} (${note}) | nivel:${n.niveles} user:${u.usuarios} | eliminado: ${name}`);
    }

    for (const id of DELETE_ONLY) {
      const name = await removePermiso(id);
      console.log(`✓ Eliminado sin reemplazo: ${id} ${name}`);
    }

    // Normalizar descripción del catálogo permisos (id 7)
    await client.query(
      `UPDATE tbl_05_permiso SET descripcion_05 = $1 WHERE id_permiso_05 = 7 AND (descripcion_05 IS NULL OR descripcion_05 = 'Sin descripción')`,
      ['Acceso al catálogo de permisos']
    );

    await client.query('COMMIT');
    console.log('\n--- Catálogo MENU_NIVEL restante ---');

    const left = await pool.query(`
      SELECT p.id_permiso_05, p.nombre_permiso_05, p.orden_05,
             COUNT(DISTINCT np.id_nivel_04)::int AS niveles,
             COUNT(DISTINCT up.id_usuario_000)::int AS usuarios
      FROM tbl_05_permiso p
      LEFT JOIN tbl_050_nivel_permiso np ON np.id_permiso_05 = p.id_permiso_05
      LEFT JOIN tbl_000_usuario_permiso up ON up.id_permiso_000 = p.id_permiso_05
      WHERE p.nombre_permiso_05 LIKE 'MENU_NIVEL%'
      GROUP BY p.id_permiso_05, p.nombre_permiso_05, p.orden_05
      ORDER BY p.orden_05, p.id_permiso_05
    `);
    console.table(left.rows);
    console.log(`Total: ${left.rows.length} (esperado: 9)`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
