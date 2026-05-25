/**
 * Catálogo: menú Neumáticos (rango 4000, posición 4 en sidebar).
 * Asigna permisos nuevos a niveles que ya tenían MENU_OPERACIONES.
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

const NEUMATICOS = [
  { nombre: 'MENU_NEUMATICOS', descripcion: 'Acceso al menú Neumáticos', orden: 4000 },
  { nombre: 'MENU_NEUMATICOS_COD_TRAZABILIDAD', descripcion: 'Cod trazabilidad de neumáticos', orden: 4010 },
  { nombre: 'MENU_NEUMATICOS_MARCAS', descripcion: 'Marcas de neumáticos', orden: 4020 },
  { nombre: 'MENU_NEUMATICOS_ESTADOS', descripcion: 'Estados de neumáticos', orden: 4030 },
  { nombre: 'MENU_NEUMATICOS_HISTORIAL', descripcion: 'Historial de neumáticos', orden: 4040 },
  { nombre: 'MENU_NEUMATICOS_PATRONES_ROTACION', descripcion: 'Patrones de rotación', orden: 4050 },
  { nombre: 'MENU_NEUMATICOS_TIPO_LLANTA', descripcion: 'Tipo llanta', orden: 4060 },
];

async function ensurePermiso({ nombre, descripcion, orden }) {
  const existing = await pool.query(
    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,
    [nombre]
  );
  if (existing.rows.length > 0) {
    if (orden !== undefined) {
      await pool.query(
        `UPDATE tbl_05_permiso SET descripcion_05 = $1, orden_05 = $2 WHERE nombre_permiso_05 = $3`,
        [descripcion, orden, nombre]
      );
    } else {
      await pool.query(
        `UPDATE tbl_05_permiso SET descripcion_05 = $1 WHERE nombre_permiso_05 = $2`,
        [descripcion, nombre]
      );
    }
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
  const neumaticoIds = [];
  for (const p of NEUMATICOS) {
    neumaticoIds.push(await ensurePermiso(p));
  }

  // Niveles con MENU_OPERACIONES heredan permisos de Neumáticos
  const nivelesOperaciones = await pool.query(
    `SELECT DISTINCT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
     WHERE p.nombre_permiso_05 = 'MENU_OPERACIONES'`
  );
  for (const { id_nivel_04 } of nivelesOperaciones.rows) {
    for (const idPermiso of neumaticoIds) {
      await assignToNivel(id_nivel_04, idPermiso);
    }
  }

  // Super Administrador (nivel 1): todos los permisos del catálogo
  const all = await pool.query(`SELECT id_permiso_05 FROM tbl_05_permiso`);
  for (const { id_permiso_05 } of all.rows) {
    await assignToNivel(1, id_permiso_05);
  }

  console.log('\nNeumáticos:', NEUMATICOS.length, 'permisos');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
