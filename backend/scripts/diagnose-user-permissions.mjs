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

const search = process.argv[2] || 'rnanziani';

async function main() {
  const userRes = await pool.query(
    `SELECT u.id_usuario_00, u.username, u.email, u.id_nivel_04, u.is_active,
            n.nombre_nivel_04
     FROM tbl_00_usuario u
     LEFT JOIN tbl_04_nivel_usuario n ON n.id_nivel_04 = u.id_nivel_04
     WHERE LOWER(u.email) LIKE LOWER($1)
        OR LOWER(u.username) LIKE LOWER($1)`,
    [`%${search}%`]
  );

  if (userRes.rows.length === 0) {
    console.log('Usuario no encontrado para:', search);
    await pool.end();
    return;
  }

  for (const u of userRes.rows) {
    console.log('\n=== USUARIO ===');
    console.log(JSON.stringify(u, null, 2));

    const nivelPerms = u.id_nivel_04
      ? await pool.query(
          `SELECT p.nombre_permiso_05
           FROM tbl_050_nivel_permiso np
           JOIN tbl_05_permiso p ON p.id_permiso_05 = np.id_permiso_05
           WHERE np.id_nivel_04 = $1
           ORDER BY p.orden_05 NULLS LAST, p.nombre_permiso_05`,
          [u.id_nivel_04]
        )
      : { rows: [] };

    const directPerms = await pool.query(
      `SELECT p.nombre_permiso_05
       FROM tbl_000_usuario_permiso up
       JOIN tbl_05_permiso p ON p.id_permiso_05 = up.id_permiso_000
       WHERE up.id_usuario_000 = $1
       ORDER BY p.nombre_permiso_05`,
      [u.id_usuario_00]
    );

    const effective = await pool.query(
      `SELECT DISTINCT p.nombre_permiso_05
       FROM tbl_05_permiso p
       WHERE p.id_permiso_05 IN (
         SELECT np.id_permiso_05 FROM tbl_050_nivel_permiso np WHERE np.id_nivel_04 = $1
         UNION
         SELECT up.id_permiso_000 FROM tbl_000_usuario_permiso up WHERE up.id_usuario_000 = $2
       )
       ORDER BY 1`,
      [u.id_nivel_04 || 0, u.id_usuario_00]
    );

    const critical = [
      'MENU_DASHBOARD',
      'MENU_NIVEL_ACCESO',
      'MENU_NIVEL_ACCESO_USUARIOS',
      'MENU_NIVEL_ACCESO_PERMISOS',
      'MENU_NIVEL_ACCESO_ASIGNACION',
      'MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS',
    ];

    const names = new Set(effective.rows.map((r) => r.nombre_permiso_05));

    console.log('\nPermisos por NIVEL:', nivelPerms.rows.length);
    console.log('Permisos DIRECTOS:', directPerms.rows.length);
    console.log('Permisos EFECTIVOS:', effective.rows.length);
    console.log('\nCríticos para menú admin:');
    for (const c of critical) {
      console.log(`  ${names.has(c) ? 'OK' : 'FALTA'}  ${c}`);
    }

    if (!names.has('MENU_NIVEL_ACCESO')) {
      console.log('\n>>> Problema: sin MENU_NIVEL_ACCESO no verás el grupo "Nivel de Acceso" en el menú.');
    }
    if (!u.is_active) {
      console.log('\n>>> Problema: is_active = false (no puede iniciar sesión).');
    }
    if (!u.id_nivel_04) {
      console.log('\n>>> id_nivel_04 es NULL — solo cuentan permisos directos.');
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
