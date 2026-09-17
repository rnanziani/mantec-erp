/**
 * Permisos tablero / reportes expediente de repuesto dañado.
 * Uso (desde backend/): node scripts/seed-expediente-repuesto-permisos.mjs
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

const PERMISOS = [
  {
    nombre: 'MENU_REPUESTOS_DANADOS_EXPEDIENTE',
    descripcion: 'Tablero expediente de repuesto dañado',
    orden: 9170,
  },
  {
    nombre: 'MENU_REPUESTOS_DANADOS_EXPEDIENTE_REPORTES',
    descripcion: 'Reportes y garantía del expediente',
    orden: 9175,
  },
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
  const ids = [];
  for (const p of PERMISOS) {
    ids.push(await ensurePermiso(p));
  }
  for (const idPermiso of ids) {
    await assignToNivel(1, idPermiso);
  }

  const niveles = await pool.query(
    `SELECT DISTINCT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
     WHERE p.nombre_permiso_05 = 'MENU_REPUESTOS_DANADOS'`
  );
  for (const { id_nivel_04 } of niveles.rows) {
    for (const idPermiso of ids) {
      await assignToNivel(id_nivel_04, idPermiso);
    }
  }

  const ref = await pool.query(
    `SELECT id_usuario_00, id_nivel_04 FROM tbl_00_usuario
     WHERE LOWER(email) = LOWER('rnanziani@gmail.com')`
  );
  for (const u of ref.rows) {
    for (const idPermiso of ids) {
      await assignToUsuario(u.id_usuario_00, idPermiso);
      if (u.id_nivel_04) await assignToNivel(u.id_nivel_04, idPermiso);
    }
  }

  console.log('Expediente:', PERMISOS.length, 'permisos listos');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
