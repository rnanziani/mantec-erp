/**
 * Catálogo Nivel de Acceso (2000-2999): permisos alineados con submenús.
 * Crea MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS y reordena orden_05 según posición en menú.
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

/** Orden = posición en submenú Nivel de Acceso (×10 desde 2130, como Mantenedores) */
const NIVEL_ACCESO = [
  { nombre: 'MENU_NIVEL_ACCESO', descripcion: 'Acceso al menú Nivel de Acceso', orden: 2000 },
  { nombre: 'MENU_NIVEL_ACCESO_USUARIOS', descripcion: 'Usuarios', orden: 2130 },
  { nombre: 'MENU_NIVEL_ACCESO_PERMISOS', descripcion: 'Catálogo de permisos', orden: 2140 },
  { nombre: 'MENU_NIVEL_ACCESO_NIVELES', descripcion: 'Nivel de acceso (roles)', orden: 2150 },
  { nombre: 'MENU_NIVEL_ACCESO_ASIGNACION', descripcion: 'Asignación niveles', orden: 2160 },
  { nombre: 'MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS', descripcion: 'Permisos directos', orden: 2170 },
  { nombre: 'MENU_NIVEL_ACCESO_HISTORIAL', descripcion: 'Historial contraseñas', orden: 2180 },
  { nombre: 'MENU_NIVEL_ACCESO_INTENTOS', descripcion: 'Intentos de login', orden: 2190 },
  { nombre: 'MENU_NIVEL_ACCESO_SESIONES', descripcion: 'Sesiones', orden: 2200 },
  { nombre: 'MENU_NIVEL_ACCESO_PARAMETROS', descripcion: 'Parámetros del sistema', orden: 2210 },
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
  console.log('Creado:', nombre, `(orden ${orden})`);
  return ins.rows[0].id_permiso_05;
}

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
  const ids = new Map();
  for (const p of NIVEL_ACCESO) {
    ids.set(p.nombre, await ensurePermiso(p));
  }

  const asignacionId = ids.get('MENU_NIVEL_ACCESO_ASIGNACION');
  const directosId = ids.get('MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS');

  const nivelesAsignacion = await pool.query(
    `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [asignacionId]
  );
  for (const { id_nivel_04 } of nivelesAsignacion.rows) {
    await assignToNivel(id_nivel_04, directosId);
  }

  const usuariosAsignacion = await pool.query(
    `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [asignacionId]
  );
  for (const { id_usuario_000 } of usuariosAsignacion.rows) {
    await assignToUsuario(id_usuario_000, directosId);
  }
  console.log(
    `Migrado ASIGNACION -> PERMISOS_DIRECTOS (${nivelesAsignacion.rowCount} niveles, ${usuariosAsignacion.rowCount} usuarios)`
  );

  const parentId = ids.get('MENU_NIVEL_ACCESO');
  const nivelesPadre = await pool.query(
    `SELECT DISTINCT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [parentId]
  );
  for (const { id_nivel_04 } of nivelesPadre.rows) {
    for (const id of ids.values()) {
      await assignToNivel(id_nivel_04, id);
    }
  }

  for (const id of ids.values()) {
    await assignToNivel(1, id);
  }

  const audit = await pool.query(
    `SELECT nombre_permiso_05, descripcion_05, orden_05
     FROM tbl_05_permiso
     WHERE orden_05 BETWEEN 2000 AND 2999
     ORDER BY orden_05`
  );
  console.log('\n=== Nivel de Acceso (2000-2999) ===');
  console.table(audit.rows);

  const dup = await pool.query(
    `SELECT nombre_permiso_05, COUNT(*)::int AS cnt
     FROM tbl_05_permiso
     WHERE nombre_permiso_05 LIKE 'MENU_NIVEL%'
     GROUP BY nombre_permiso_05
     HAVING COUNT(*) > 1`
  );
  console.log('Duplicados:', dup.rows.length === 0 ? 'ninguno' : dup.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
