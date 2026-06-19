/**
 * Permiso Operaciones: Cargo Máquina (3130)
 * Asigna a niveles/usuarios que ya tienen MENU_OPERACIONES.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bd_etiquetas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const PERMISO = {
  nombre: 'MENU_OPERACIONES_CARGO_MAQUINA',
  descripcion: 'Cargo Máquina (insumos por máquina/trabajador)',
  orden: 3130,
};

async function ensurePermiso() {
  const existing = await pool.query(
    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,
    [PERMISO.nombre]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE tbl_05_permiso SET descripcion_05 = $1, orden_05 = $2 WHERE nombre_permiso_05 = $3`,
      [PERMISO.descripcion, PERMISO.orden, PERMISO.nombre]
    );
    return existing.rows[0].id_permiso_05;
  }
  const ins = await pool.query(
    `INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)
     VALUES ($1, $2, $3) RETURNING id_permiso_05`,
    [PERMISO.nombre, PERMISO.descripcion, PERMISO.orden]
  );
  console.log('Creado permiso:', PERMISO.nombre);
  return ins.rows[0].id_permiso_05;
}

async function assignToNivelesConOperaciones(idPermiso) {
  const niveles = await pool.query(
    `SELECT DISTINCT np.id_nivel_04
     FROM tbl_050_nivel_permiso np
     INNER JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
     WHERE p.nombre_permiso_05 = 'MENU_OPERACIONES'`
  );
  for (const row of niveles.rows) {
    await pool.query(
      `INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)
       SELECT $1, $2 WHERE NOT EXISTS (
         SELECT 1 FROM tbl_050_nivel_permiso WHERE id_nivel_04 = $1 AND id_permiso_05 = $2
       )`,
      [row.id_nivel_04, idPermiso]
    );
  }
  console.log('Asignado a', niveles.rowCount, 'nivel(es) con MENU_OPERACIONES');
}

async function main() {
  const idPermiso = await ensurePermiso();
  await assignToNivelesConOperaciones(idPermiso);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
