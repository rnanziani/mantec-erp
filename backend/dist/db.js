import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const POOL_OPTS = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};
/** Render PostgreSQL exige SSL; localhost no. */
function sslForHost(host) {
    if (process.env.DB_SSL === 'false')
        return undefined;
    if (process.env.DB_SSL === 'true')
        return { rejectUnauthorized: false };
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal)
        return undefined;
    return { rejectUnauthorized: false };
}
function buildPoolConfig() {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl) {
        const hostMatch = databaseUrl.match(/@([^:/]+)/);
        const ssl = sslForHost(hostMatch?.[1] ?? '');
        return { connectionString: databaseUrl, ...POOL_OPTS, ...(ssl ? { ssl } : {}) };
    }
    const host = process.env.DB_HOST || 'localhost';
    const ssl = sslForHost(host);
    return {
        host,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'mantec_erc',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ...POOL_OPTS,
        ...(ssl ? { ssl } : {}),
    };
}
export const pool = new Pool(buildPoolConfig());
// Evento para manejar errores del pool
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});
// Función para verificar la conexión
export const testConnection = async () => {
    try {
        console.log('🔄 Intentando conectar a PostgreSQL...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
        console.log(`   Database: ${process.env.DB_NAME || 'mantec_erc'}`);
        console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Error al conectar con PostgreSQL:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   ⚠️  PostgreSQL no está corriendo o no está accesible en el host/puerto especificado');
            console.error('   💡 Verifica que PostgreSQL esté corriendo y que las credenciales sean correctas');
        }
        else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            console.error('   ⚠️  Timeout de conexión - El servidor PostgreSQL no responde');
            console.error('   💡 Verifica que PostgreSQL esté corriendo y accesible');
        }
        else if (error.code === '28P01') {
            console.error('   ⚠️  Error de autenticación - Usuario o contraseña incorrectos');
        }
        else if (error.code === '3D000') {
            console.error('   ⚠️  La base de datos no existe');
            console.error(`   💡 Crea la base de datos: ${process.env.DB_NAME || 'mantec_erc'}`);
        }
        return false;
    }
};
