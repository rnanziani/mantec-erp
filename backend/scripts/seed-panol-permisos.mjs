/**
 * Catálogo: menú Pañol (rango 8000).
 * Asigna a Super Admin (nivel 1) y a niveles con MENU_OPERACIONES.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

/** Local (DB_HOST) o producción Render (DATABASE_URL + SSL). */
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

const PANOL = [
  { nombre: 'MENU_PANOL', descripcion: 'Acceso al menú Pañol', orden: 8000 },
  { nombre: 'MENU_PANOL_HERRAMIENTAS', descripcion: 'CRUD de herramientas del pañol', orden: 8010 },
  { nombre: 'MENU_PANOL_MOVIMIENTOS', descripcion: 'Movimientos de pañol (salida/devolución)', orden: 8020 },
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

async function main() {
  const ids = [];
  for (const p of PANOL) {
    ids.push(await ensurePermiso(p));
  }

  const nivelesOperaciones = await pool.query(
    `SELECT DISTINCT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
     WHERE p.nombre_permiso_05 = 'MENU_OPERACIONES'`
  );
  for (const { id_nivel_04 } of nivelesOperaciones.rows) {
    for (const idPermiso of ids) {
      await assignToNivel(id_nivel_04, idPermiso);
    }
  }

  for (const idPermiso of ids) {
    await assignToNivel(1, idPermiso);
  }

  console.log('\nPañol:', PANOL.length, 'permisos listos');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
