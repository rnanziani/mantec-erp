/**
 * Aplica NUEVO en chk_tbl_66. Uso (desde backend/):
 * node scripts/apply-tbl-66-estado-nuevo.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../../database/alter_tbl_66_estado_nuevo.sql');

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
const sql = fs.readFileSync(sqlPath, 'utf8');
await pool.query(sql);
const chk = await pool.query(
  `SELECT pg_get_constraintdef(oid) AS def
   FROM pg_constraint
   WHERE conname = 'chk_tbl_66_estado_valido'`
);
console.log('OK:', chk.rows[0]?.def || 'sin constraint');
await pool.end();
