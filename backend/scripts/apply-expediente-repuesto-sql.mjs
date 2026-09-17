/**
 * Crea tbl_86 / tbl_87. Uso (desde backend/):
 * node scripts/apply-expediente-repuesto-sql.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFiles = [
  path.resolve(__dirname, '../../database/create_tbl_86_87_expediente_repuesto.sql'),
  path.resolve(__dirname, '../../database/alter_tbl_86_valor_reparacion.sql'),
];

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

async function main() {
  for (const sqlPath of sqlFiles) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('OK:', path.basename(sqlPath));
  }
  const t = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('tbl_86_expediente_repuesto', 'tbl_87_historial_expediente_repuesto')
     ORDER BY table_name`
  );
  console.log('Tablas:', t.rows.map((r) => r.table_name).join(', '));
  await pool.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
