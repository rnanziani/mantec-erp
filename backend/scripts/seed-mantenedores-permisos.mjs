/**
 * Catálogo Mantenedores (6000-6999): permisos granulares alineados con submenús.
 * Asigna permisos nuevos a niveles/usuarios que ya tenían MENU_MANTENEDORES.
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

/** Orden = posición en submenú Mantenedores (×10 desde 6130) */
const MANTENEDORES = [
  { nombre: 'MENU_MANTENEDORES', descripcion: 'Acceso al menú Mantenedores', orden: 6000 },
  { nombre: 'MENU_MANTENEDORES_CARGOS', descripcion: 'Cargos', orden: 6130 },
  { nombre: 'MENU_MANTENEDORES_TECNICOS', descripcion: 'Técnicos', orden: 6140 },
  { nombre: 'MENU_MANTENEDORES_TRABAJADORES', descripcion: 'Trabajadores', orden: 6150 },
  { nombre: 'MENU_MANTENEDORES_PRODUCTOS_ASEO', descripcion: 'Productos de aseo', orden: 6160 },
  { nombre: 'MENU_MANTENEDORES_MAQUINAS', descripcion: 'Máquinas', orden: 6170 },
  { nombre: 'MENU_MANTENEDORES_RESPONSABLES_ENTREGA', descripcion: 'Responsables de entrega', orden: 6180 },
  { nombre: 'MENU_MANTENEDORES_TIPOS_COMP', descripcion: 'Tipos componente', orden: 6190 },
  { nombre: 'MENU_MANTENEDORES_CATEGORIAS', descripcion: 'Categorías', orden: 6200 },
  { nombre: 'MENU_MANTENEDORES_TALLAS', descripcion: 'Tallas', orden: 6210 },
  { nombre: 'MENU_MANTENEDORES_PRENDAS', descripcion: 'Prendas', orden: 6220 },
  { nombre: 'MENU_MANTENEDORES_CCOSTOS', descripcion: 'Centros de costo', orden: 6230 },
  { nombre: 'MENU_MANTENEDORES_INSUMOS', descripcion: 'Insumos', orden: 6240 },
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
  for (const p of MANTENEDORES) {
    ids.set(p.nombre, await ensurePermiso(p));
  }

  const parentId = ids.get('MENU_MANTENEDORES');
  const hijosNuevos = MANTENEDORES.filter((p) => p.orden >= 6180).map((p) => p.nombre);

  const niveles = await pool.query(
    `SELECT DISTINCT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
    [parentId]
  );
  for (const { id_nivel_04 } of niveles.rows) {
    for (const nombre of hijosNuevos) {
      await assignToNivel(id_nivel_04, ids.get(nombre));
    }
  }
  console.log(`Niveles con MENU_MANTENEDORES: ${niveles.rowCount} → permisos 6180-6240 asignados`);

  const usuarios = await pool.query(
    `SELECT DISTINCT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
    [parentId]
  );
  for (const { id_usuario_000 } of usuarios.rows) {
    for (const nombre of hijosNuevos) {
      await assignToUsuario(id_usuario_000, ids.get(nombre));
    }
  }

  for (const id of ids.values()) {
    await assignToNivel(1, id);
  }

  const audit = await pool.query(
    `SELECT nombre_permiso_05, descripcion_05, orden_05
     FROM tbl_05_permiso
     WHERE orden_05 BETWEEN 6000 AND 6999
     ORDER BY orden_05`
  );
  console.log('\n=== Mantenedores (6000-6999) ===');
  console.table(audit.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
