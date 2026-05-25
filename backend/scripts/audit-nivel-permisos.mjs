/**
 * Lista permisos asignados a un nivel (por id o nombre).
 * Uso: node scripts/audit-nivel-permisos.mjs 4
 *      node scripts/audit-nivel-permisos.mjs "OPERADOR"
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

const search = process.argv[2] || '4';

async function main() {
  const nivelRes = await pool.query(
    `SELECT id_nivel_04, nombre_nivel_04, descripcion_04
     FROM tbl_04_nivel_usuario
     WHERE id_nivel_04::text = $1 OR nombre_nivel_04 ILIKE $2`,
    [search, `%${search}%`]
  );

  if (nivelRes.rows.length === 0) {
    console.log('Nivel no encontrado:', search);
    await pool.end();
    return;
  }

  for (const nivel of nivelRes.rows) {
    console.log('\n=== NIVEL ===');
    console.log(JSON.stringify(nivel, null, 2));

    const perms = await pool.query(
      `SELECT p.nombre_permiso_05, p.descripcion_05, p.orden_05
       FROM tbl_050_nivel_permiso np
       JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
       WHERE np.id_nivel_04 = $1
       ORDER BY COALESCE(p.orden_05, 9999), p.nombre_permiso_05`,
      [nivel.id_nivel_04]
    );

    console.log(`\nPermisos del nivel (${perms.rows.length}):`);
    for (const p of perms.rows) {
      console.log(`  ${String(p.orden_05 ?? '').padStart(4)} | ${p.nombre_permiso_05}`);
    }

    const grupos = {
      operaciones: perms.rows.filter((p) => p.nombre_permiso_05.startsWith('MENU_OPERACIONES')),
      neumaticos: perms.rows.filter((p) => p.nombre_permiso_05.startsWith('MENU_NEUMATICOS')),
    };
    console.log('\n--- Resumen ---');
    console.log('Operaciones:', grupos.operaciones.map((p) => p.nombre_permiso_05).join(', ') || '(ninguno)');
    console.log('Neumáticos:', grupos.neumaticos.map((p) => p.nombre_permiso_05).join(', ') || '(ninguno)');

    const users = await pool.query(
      `SELECT id_usuario_00, email, username, is_active FROM tbl_00_usuario WHERE id_nivel_04 = $1 ORDER BY email`,
      [nivel.id_nivel_04]
    );
    console.log(`\nUsuarios con este nivel (${users.rows.length}):`);
    for (const u of users.rows) {
      console.log(`  ${u.email} (${u.username}) active=${u.is_active}`);
      const direct = await pool.query(
        `SELECT p.nombre_permiso_05, p.orden_05
         FROM tbl_000_usuario_permiso up
         JOIN tbl_05_permiso p ON p.id_permiso_05 = up.id_permiso_000
         WHERE up.id_usuario_000 = $1
         ORDER BY COALESCE(p.orden_05, 9999), p.nombre_permiso_05`,
        [u.id_usuario_00]
      );
      if (direct.rows.length > 0) {
        console.log('    Directos:');
        for (const d of direct.rows) {
          console.log(`      ${String(d.orden_05 ?? '').padStart(4)} | ${d.nombre_permiso_05}`);
        }
      }
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
