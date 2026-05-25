/**
 * Permisos exclusivos Gestión Alternadores (rango 5000, posición 5 en sidebar).
 * Migra asignaciones desde MENU_INVENTARIO y permisos hijos legacy.
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

const GESTION_ALTERNADORES = [
  { nombre: 'MENU_GESTION_ALTERNADORES', descripcion: 'Acceso al menú Gestión Alternadores', orden: 5000 },
  { nombre: 'MENU_GESTION_ALTERNADORES_ALTERNADORES', descripcion: 'Alternadores', orden: 5010 },
  { nombre: 'MENU_GESTION_ALTERNADORES_ESTADO', descripcion: 'Estado alternador', orden: 5020 },
  { nombre: 'MENU_GESTION_ALTERNADORES_BODEGAS', descripcion: 'Bodegas', orden: 5030 },
  { nombre: 'MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION', descripcion: 'Tipos de transacción', orden: 5040 },
  { nombre: 'MENU_GESTION_ALTERNADORES_MOVIMIENTOS', descripcion: 'Movimientos', orden: 5050 },
  { nombre: 'MENU_GESTION_ALTERNADORES_STOCK', descripcion: 'Stock actual', orden: 5060 },
  { nombre: 'MENU_GESTION_ALTERNADORES_MARCAS', descripcion: 'Marca alternadores', orden: 5070 },
];

/** permiso legacy -> permiso nuevo */
const LEGACY_MAP = [
  { from: 'MENU_INVENTARIO', to: 'MENU_GESTION_ALTERNADORES' },
  { from: 'MENU_MANTENEDORES_ALTERNADORES', to: 'MENU_GESTION_ALTERNADORES_ALTERNADORES' },
  { from: 'MENU_MANTENEDORES_ESTADOS', to: 'MENU_GESTION_ALTERNADORES_ESTADO' },
  { from: 'MENU_INVENTARIO_BODEGAS', to: 'MENU_GESTION_ALTERNADORES_BODEGAS' },
  { from: 'MENU_INVENTARIO_TIPOS_TRANSACCION', to: 'MENU_GESTION_ALTERNADORES_TIPOS_TRANSACCION' },
  { from: 'MENU_INVENTARIO_TRANSACCIONES', to: 'MENU_GESTION_ALTERNADORES_MOVIMIENTOS' },
  { from: 'MENU_INVENTARIO_EXISTENCIAS', to: 'MENU_GESTION_ALTERNADORES_STOCK' },
  { from: 'MENU_MANTENEDORES_MARCAS', to: 'MENU_GESTION_ALTERNADORES_MARCAS' },
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

async function main() {
  const newIds = new Map();
  for (const p of GESTION_ALTERNADORES) {
    newIds.set(p.nombre, await ensurePermiso(p));
  }

  for (const { from, to } of LEGACY_MAP) {
    const fromId = await getIdByName(from);
    const toId = newIds.get(to);
    if (!fromId || !toId) continue;

    const niveles = await pool.query(
      `SELECT id_nivel_04 FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`,
      [fromId]
    );
    for (const { id_nivel_04 } of niveles.rows) {
      await assignToNivel(id_nivel_04, toId);
    }

    const usuarios = await pool.query(
      `SELECT id_usuario_000 FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`,
      [fromId]
    );
    for (const { id_usuario_000 } of usuarios.rows) {
      await assignToUsuario(id_usuario_000, toId);
    }
    console.log(`Migrado: ${from} -> ${to} (${niveles.rowCount} niveles, ${usuarios.rowCount} usuarios)`);

    await pool.query(`DELETE FROM tbl_050_nivel_permiso WHERE id_permiso_05 = $1`, [fromId]);
    await pool.query(`DELETE FROM tbl_000_usuario_permiso WHERE id_permiso_000 = $1`, [fromId]);
  }

  // Super Administrador: todos los nuevos
  for (const id of newIds.values()) {
    await assignToNivel(1, id);
  }

  console.log('\nGestión Alternadores:', GESTION_ALTERNADORES.length, 'permisos (5000-5070)');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
