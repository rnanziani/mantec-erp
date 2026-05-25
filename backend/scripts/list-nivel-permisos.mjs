import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();
const p = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'mantec_erc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});
const r = await p.query(
  `SELECT id_permiso_05, nombre_permiso_05, descripcion_05, orden_05
   FROM tbl_05_permiso
   WHERE nombre_permiso_05 LIKE 'MENU%'
   ORDER BY COALESCE(orden_05, 9999), nombre_permiso_05`
);
console.log(JSON.stringify(r.rows, null, 2));
await p.end();
