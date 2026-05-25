/**
 * Elimina permisos huérfanos (no referenciados en Sidebar.tsx / App.tsx).
 * Antes migra asignaciones al permiso padre cuando aplica.
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

/** id obsoleto -> id padre en catálogo (el que usa el menú hoy) */
const MIGRATE_THEN_DELETE = [
  { from: 64, to: 3, note: 'CONSUMO_INSUMOS -> MENU_OPERACIONES' },
  { from: 58, to: 6, note: 'TIPOS_COMP -> MENU_MANTENEDORES' },
  { from: 59, to: 3, note: 'COD_TRAZABILIDAD -> MENU_OPERACIONES' },
  { from: 60, to: 3, note: 'MARCAS_NEUMATICOS -> MENU_OPERACIONES' },
  { from: 61, to: 3, note: 'ESTADO_NEUMATICO -> MENU_OPERACIONES' },
  { from: 62, to: 3, note: 'HISTORIAL_NEUMATICOS -> MENU_OPERACIONES' },
  { from: 63, to: 3, note: 'PATRON_ROTACION -> MENU_OPERACIONES' },
];

async function migrateNivelPermiso(fromId, toId) {
  const { rows } = await pool.query(
    `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [fromId]
  );
  for (const { id_nivel_04 } of rows) {
    await pool.query(
      `INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
       SELECT $1, $2 WHERE NOT EXISTS (
         SELECT 1 FROM tbl_050_nivel_permiso WHERE id_nivel_04 = $1 AND id_permiso_05 = $2
       )`,
      [id_nivel_04, toId]
    );
  }
  await pool.query(`DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`, [fromId]);
  return rows.length;
}

async function migrateUsuarioPermiso(fromId, toId) {
  const { rows } = await pool.query(
    `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [fromId]
  );
  for (const { id_usuario_000 } of rows) {
    await pool.query(
      `INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)
       SELECT $1, $2 WHERE NOT EXISTS (
         SELECT 1 FROM tbl_000_usuario_permiso WHERE id_usuario_000 = $1 AND id_permiso_000 = $2
       )`,
      [id_usuario_000, toId]
    );
  }
  await pool.query(`DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`, [fromId]);
  return rows.length;
}

async function removePermiso(id) {
  const r = await pool.query(
    `DELETE FROM tbl_05_permiso WHERE id_permiso_05 = $1 RETURNING nombre_permiso_05`,
    [id]
  );
  return r.rows[0]?.nombre_permiso_05;
}

async function main() {
  console.log('=== Limpieza permisos fuera de rango 2000 (huérfanos) ===\n');

  for (const { from, to, note } of MIGRATE_THEN_DELETE) {
    const n = await migrateNivelPermiso(from, to);
    const u = await migrateUsuarioPermiso(from, to);
    const name = await removePermiso(from);
    console.log(`✓ ${from} eliminado (${name}) -> padre ${to} | niveles migrados: ${n}, usuarios: ${u} | ${note}`);
  }

  const summary = await pool.query(`
    SELECT
      CASE
        WHEN orden_05 BETWEEN 1000 AND 1999 THEN 'Dashboard'
        WHEN orden_05 BETWEEN 2000 AND 2999 THEN 'Nivel acceso'
        WHEN orden_05 BETWEEN 3000 AND 3999 THEN 'Operaciones'
        WHEN orden_05 BETWEEN 4000 AND 4999 THEN 'Inventario'
        WHEN orden_05 BETWEEN 5000 AND 5999 THEN 'Reportes'
        WHEN orden_05 BETWEEN 6000 AND 6999 THEN 'Mantenedores'
        WHEN orden_05 BETWEEN 7000 AND 7999 THEN 'Neumáticos'
        ELSE 'Otro'
      END AS modulo,
      COUNT(*)::int AS cantidad
    FROM tbl_05_permiso
    GROUP BY 1
    ORDER BY MIN(orden_05)
  `);

  console.log('\n=== Resumen por módulo ===');
  console.table(summary.rows);

  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM tbl_05_permiso`);
  console.log(`Total catálogo: ${total.rows[0].total} permisos`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
