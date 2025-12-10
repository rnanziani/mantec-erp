import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
// Configuración del pool de conexiones a PostgreSQL
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mantec_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Evento para manejar errores del pool
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});
// Función para verificar la conexión
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Error al conectar con PostgreSQL:', error);
        return false;
    }
};
