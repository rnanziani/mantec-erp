/**
 * Elimina permisos duplicados de Gestión Alternadores (legacy).
 * Verifica que cada asignación legacy tenga su equivalente en rango 8000 antes de borrar.
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

/** permiso legacy -> permiso nuevo (menú Gestión Alternadores) */
const LEGACY_TO_NEW = [
  { from: 'MENU_INVENTARIO', to: 'MENU_GESTION_ALTERNADORES' },
  { from: 'MENU_MANTENEDORES_ALTERNADORES', to: 'MENU_GESTION_ALTERNADORES_ALTERNADORES' },
  { from: 'MENU_MANTENEDORES_ESTADOS', to: 'MENU_GESTION_ALTERNADORES_ESTADO' },
  { from: 'MENU_INVENTARIO_BODEGAS', to: 'MENU_GESTION_ALTERNADORES_BODEGAS' },
  { from: 'MENU_INVENTARIO_TIPOS_TRANSACCION', to: 'MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION' },
  { from: 'MENU_INVENTARIO_TRANSACCIONES', to: 'MENU_GESTION_ALTERNADORES_MOVIMIENTOS' },
  { from: 'MENU_INVENTARIO_EXISTENCIAS', to: 'MENU_GESTION_ALTERNADORES_STOCK' },
];

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

async function ensureMigrated(fromId, toId, fromName, toName) {
  const nivelesSinNuevo = await pool.query(
    `SELECT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     WHERE np.id_permiso_05 = $1
       AND NOT EXISTS (
         SELECT 1 FROM tbl_050_nivel_permiso np2
         WHERE np2.id_nivel_04 = np.id_nivel_04 AND np2.id_permiso_05 = $2
       )`,
    [fromId, toId]
  );
  for (const { id_nivel_04 } of nivelesSinNuevo.rows) {
    await assignToNivel(id_nivel_04, toId);
    console.log(`  + Nivel ${id_nivel_04}: ${fromName} -> ${toName}`);
  }

  const usuariosSinNuevo = await pool.query(
    `SELECT up.id_usuario_000
     FROM tbl_000_usuario_permiso up
     WHERE up.id_permiso_000 = $1
       AND NOT EXISTS (
         SELECT 1 FROM tbl_000_usuario_permiso up2
         WHERE up2.id_usuario_000 = up.id_usuario_000 AND up2.id_permiso_000 = $2
       )`,
    [fromId, toId]
  );
  for (const { id_usuario_000 } of usuariosSinNuevo.rows) {
    await assignToUsuario(id_usuario_000, toId);
    console.log(`  + Usuario ${id_usuario_000}: ${fromName} -> ${toName}`);
  }

  return {
    nivelesReparados: nivelesSinNuevo.rowCount,
    usuariosReparados: usuariosSinNuevo.rowCount,
  };
}

async function removeLegacyPermiso(fromId, fromName) {
  await pool.query(`DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`, [fromId]);
  await pool.query(`DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`, [fromId]);
  const del = await pool.query(
    `DELETE FROM tbl_05_permiso WHERE id_permiso_05 = $1 RETURNING nombre_permiso_05`,
    [fromId]
  );
  return del.rows[0]?.nombre_permiso_05 ?? fromName;
}

async function main() {
  console.log('=== Eliminación permisos legacy Gestión Alternadores ===\n');

  let eliminados = 0;
  let reparadosN = 0;
  let reparadosU = 0;

  for (const { from, to } of LEGACY_TO_NEW) {
    const fromId = await getIdByName(from);
    const toId = await getIdByName(to);

    if (!fromId) {
      console.log(`○ ${from}: ya no existe en catálogo`);
      continue;
    }
    if (!toId) {
      throw new Error(`Permiso destino ${to} no existe. Ejecuta seed-gestion-alternadores-permisos.mjs primero.`);
    }

    console.log(`→ ${from} (id ${fromId}) -> ${to} (id ${toId})`);
    const { nivelesReparados, usuariosReparados } = await ensureMigrated(fromId, toId, from, to);
    reparadosN += nivelesReparados;
    reparadosU += usuariosReparados;

    const name = await removeLegacyPermiso(fromId, from);
    console.log(`✓ Eliminado: ${name}\n`);
    eliminados++;
  }

  const restantes = await pool.query(
    `SELECT nombre_permiso_05, orden_05
     FROM tbl_05_permiso
     WHERE nombre_permiso_05 = ANY($1::text[])
     ORDER BY orden_05`,
    [LEGACY_TO_NEW.map((x) => x.from)]
  );

  if (restantes.rows.length > 0) {
    throw new Error(`Quedaron permisos legacy sin eliminar: ${JSON.stringify(restantes.rows)}`);
  }

  const summary = await pool.query(`
    SELECT
      CASE
        WHEN orden_05 BETWEEN 1000 AND 1999 THEN 'Dashboard'
        WHEN orden_05 BETWEEN 2000 AND 2999 THEN 'Nivel acceso'
        WHEN orden_05 BETWEEN 3000 AND 3999 THEN 'Operaciones'
        WHEN orden_05 BETWEEN 4000 AND 4999 THEN 'Inventario (legacy)'
        WHEN orden_05 BETWEEN 5000 AND 5999 THEN 'Reportes'
        WHEN orden_05 BETWEEN 6000 AND 6999 THEN 'Mantenedores'
        WHEN orden_05 BETWEEN 7000 AND 7999 THEN 'Neumáticos'
        WHEN orden_05 BETWEEN 8000 AND 8999 THEN 'Gestión Alternadores'
        ELSE 'Otro'
      END AS modulo,
      COUNT(*)::int AS cantidad
    FROM tbl_05_permiso
    GROUP BY 1
    ORDER BY MIN(orden_05)
  `);

  console.log('=== Resumen ===');
  console.log(`Eliminados: ${eliminados} | Niveles reparados: ${reparadosN} | Usuarios reparados: ${reparadosU}`);
  console.table(summary.rows);

  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM tbl_05_permiso`);
  console.log(`Total catálogo: ${total.rows[0].total} permisos`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
