import 'dotenv/config';
import pg from 'pg';

const email = process.argv[2] || 'rmanziani@gmail.com';
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  console.log('DB:', process.env.DB_NAME);
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_00_usuario' ORDER BY ordinal_position`
  );
  console.log('Columns tbl_00_usuario:', cols.rows.map(c => c.column_name).join(', '));

  const r = await pool.query(
    `SELECT id_usuario_00, username, email, is_active, password_expires_at,
            LEFT(password_hash, 30) as hash_prefix, LENGTH(password_hash) as hash_len
     FROM tbl_00_usuario WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  console.log('User search for', email, ':', r.rows.length, 'found');
  console.log(JSON.stringify(r.rows, null, 2));

  const all = await pool.query(
    `SELECT id_usuario_00, email, username, is_active FROM tbl_00_usuario ORDER BY id_usuario_00`
  );
  console.log('\nAll users (' + all.rows.length + '):');
  all.rows.forEach(u => console.log(`  #${u.id_usuario_00} ${u.email} (${u.username}) active=${u.is_active}`));
} finally {
  await pool.end();
}
