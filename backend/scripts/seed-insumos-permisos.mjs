/**
 * Catálogo: menú Insumos (rango 12000).
 * Crea MENU_INSUMOS* y copia asignaciones desde Operaciones / Mantenedores.
 *
 * Uso (desde backend/):
 *   node scripts/seed-insumos-permisos.mjs
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

function buildPool() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const hostMatch = databaseUrl.match(/@([^:/]+)/);
    const host = hostMatch?.[1] ?? '';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    return new pg.Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'mantec_erc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });
}

const pool = buildPool();

const INSUMOS = [
  {
    nombre: 'MENU_INSUMOS',
    descripcion: 'Acceso al menú Insumos',
    orden: 12000,
  },
  {
    nombre: 'MENU_INSUMOS_ASIGNACION',
    descripcion: 'Asignación de insumos a trabajadores',
    orden: 12010,
  },
  {
    nombre: 'MENU_INSUMOS_CATALOGO',
    descripcion: 'CRUD catálogo de insumos',
    orden: 12020,
  },
  {
    nombre: 'MENU_INSUMOS_MARCAS',
    descripcion: 'CRUD marca de insumo',
    orden: 12030,
  },
];

/** permiso legado -> permisos nuevos (siempre incluye el padre del menú) */
const LEGACY_MAP = [
  { from: 'MENU_OPERACIONES', to: ['MENU_INSUMOS', 'MENU_INSUMOS_ASIGNACION'] },
  { from: 'MENU_MANTENEDORES_INSUMOS', to: ['MENU_INSUMOS', 'MENU_INSUMOS_CATALOGO'] },
  { from: 'MENU_MANTENEDORES_MARCAS_INSUMO', to: ['MENU_INSUMOS', 'MENU_INSUMOS_MARCAS'] },
];

async function ensurePermiso({ nombre, descripcion, orden }) {
  const existing = await pool.query(
    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,
    [nombre]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE tbl_05_permiso SET descripcion_05 = $1, orden_05 = $2 WHERE nombre_permiso_05 = $3`,
      [descripcion, orden, nombre]
    );
    return existing.rows[0].id_permiso_05;
  }
  const ins = await pool.query(
    `INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
     VALUES ($1, $2, $3) RETURNING id_permiso_05`,
    [nombre, descripcion, orden]
  );
  console.log('Creado:', nombre);
  return ins.rows[0].id_permiso_05;
}

async function getIdByName(nombre) {
  const r = await pool.query(
    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,
    [nombre]
  );
  return r.rows[0]?.id_permiso_05;
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

async function copyFromLegacy(fromName, toNames, newIds) {
  const fromId = await getIdByName(fromName);
  if (!fromId) {
    console.log('Sin legado:', fromName);
    return;
  }

  const niveles = await pool.query(
    `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [fromId]
  );
  const usuarios = await pool.query(
    `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [fromId]
  );

  for (const toName of toNames) {
    const toId = newIds.get(toName);
    if (!toId) continue;
    for (const { id_nivel_04 } of niveles.rows) {
      await assignToNivel(id_nivel_04, toId);
    }
    for (const { id_usuario_000 } of usuarios.rows) {
      await assignToUsuario(id_usuario_000, toId);
    }
  }
  console.log(
    `Copiado: ${fromName} -> ${toNames.join(', ')} (${niveles.rowCount} niveles, ${usuarios.rowCount} usuarios)`
  );
}

async function main() {
  const newIds = new Map();
  for (const p of INSUMOS) {
    newIds.set(p.nombre, await ensurePermiso(p));
  }

  for (const idPermiso of newIds.values()) {
    await assignToNivel(1, idPermiso);
  }

  const refUser = await pool.query(
    `SELECT id_usuario_00, id_nivel_04 FROM tbl_00_usuario
     WHERE LOWER(email) = LOWER('rnanziani@gmail.com')`
  );
  for (const { id_usuario_00, id_nivel_04 } of refUser.rows) {
    for (const idPermiso of newIds.values()) {
      await assignToUsuario(id_usuario_00, idPermiso);
      if (id_nivel_04) await assignToNivel(id_nivel_04, idPermiso);
    }
  }

  for (const { from, to } of LEGACY_MAP) {
    await copyFromLegacy(from, to, newIds);
  }

  console.log('\nInsumos:', INSUMOS.length, 'permisos listos');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
