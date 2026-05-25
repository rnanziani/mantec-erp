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

async function main() {
  const all = await pool.query(`
    SELECT
      p.id_permiso_05,
      p.nombre_permiso_05,
      p.orden_05,
      COUNT(DISTINCT np.id_nivel_04)::int AS niveles,
      COUNT(DISTINCT up.id_usuario_000)::int AS usuarios
    FROM tbl_05_permiso p
    LEFT JOIN tbl_050_nivel_permiso np ON np.id_permiso_05 = p.id_permiso_05
    LEFT JOIN tbl_000_usuario_permiso up ON up.id_permiso_000 = p.id_permiso_05
    GROUP BY p.id_permiso_05, p.nombre_permiso_05, p.orden_05
    ORDER BY COALESCE(p.orden_05, 9999), p.nombre_permiso_05
  `);

  const dups = await pool.query(`
    SELECT nombre_permiso_05, COUNT(*)::int AS cnt,
           ARRAY_AGG(id_permiso_05 ORDER BY id_permiso_05) AS ids
    FROM tbl_05_permiso
    GROUP BY nombre_permiso_05
    HAVING COUNT(*) > 1
  `);

  console.log('TOTAL PERMISOS:', all.rows.length);
  console.log('\n=== POR RANGO ===');
  const ranges = [
    [1000, 1999, 'Inicio'],
    [2000, 2999, 'Nivel de Acceso'],
    [3000, 3999, 'Operaciones'],
    [4000, 4999, 'Neumáticos'],
    [5000, 5999, 'Gestión Alternadores'],
    [6000, 6999, 'Mantenedores'],
    [7000, 7999, 'Reportes'],
  ];
  for (const [min, max, label] of ranges) {
    const n = all.rows.filter((r) => r.orden_05 >= min && r.orden_05 <= max).length;
    console.log(`${label} (${min}-${max}): ${n}`);
  }

  console.log('\n=== DUPLICADOS EXACTOS (mismo nombre) ===');
  console.log(JSON.stringify(dups.rows, null, 2));

  console.log('\n=== CATÁLOGO COMPLETO ===');
  console.table(all.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
