import { pool } from '../db.js';

const runMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migración V2 - Control de Ubicaciones...');

        await client.query('BEGIN');

        // 1. Modificar tbl_19_alternador
        console.log('🛠️  Modificando tbl_19_alternador...');

        // Verificar si las columnas ya existen para evitar errores
        const checkCols19 = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tbl_19_alternador' AND column_name='estado_ubicacion'
    `);

        if (checkCols19.rows.length === 0) {
            await client.query(`
        ALTER TABLE tbl_19_alternador 
        ADD COLUMN estado_ubicacion VARCHAR(20) DEFAULT 'BODEGA',
        ADD COLUMN id_ubicacion_actual INTEGER;
      `);
            console.log('   ✅ Columnas estado_ubicacion e id_ubicacion_actual agregadas.');
        } else {
            console.log('   ℹ️  Columnas ya existen en tbl_19_alternador.');
        }

        // 2. Modificar tbl_28_transaccion
        console.log('🛠️  Modificando tbl_28_transaccion...');

        const checkCols28 = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tbl_28_transaccion' AND column_name='id_maquina_28'
    `);

        if (checkCols28.rows.length === 0) {
            await client.query(`
        ALTER TABLE tbl_28_transaccion
        ADD COLUMN id_maquina_28 INTEGER NULL,
        ADD COLUMN id_orden_trabajo_28 INTEGER NULL;
      `);
            console.log('   ✅ Columnas id_maquina_28 e id_orden_trabajo_28 agregadas.');
        } else {
            console.log('   ℹ️  Columnas ya existen en tbl_28_transaccion.');
        }

        // 3. Crear nuevos tipos de transacción si no existen
        console.log('🛠️  Verificando Tipos de Transacción...');

        const tipos = [
            { cod: 'SMQ', desc: 'Salida a Máquina', valor: -1 },
            { cod: 'STL', desc: 'Salida a Taller', valor: -1 },
            { cod: 'SBJ', desc: 'Salida por Baja', valor: -1 },
            { cod: 'MQT', desc: 'Máquina a Taller (Rechazo)', valor: 0 }, // No afecta stock bodega, pero cambia estado
            { cod: 'TLB', desc: 'Taller a Bodega (Reparado)', valor: 1 }
        ];

        for (const tipo of tipos) {
            const res = await client.query(
                'SELECT id_tipo_transaccion_25 FROM tbl_25_tipo_transaccion WHERE cod_accion_25 = $1',
                [tipo.cod]
            );

            if (res.rows.length === 0) {
                await client.query(
                    'INSERT INTO tbl_25_tipo_transaccion (descripcion_25, cod_accion_25, valor_accion_25) VALUES ($1, $2, $3)',
                    [tipo.desc, tipo.cod, tipo.valor]
                );
                console.log(`   ✅ Tipo creado: ${tipo.cod} - ${tipo.desc}`);
            } else {
                console.log(`   ℹ️  Tipo ya existe: ${tipo.cod}`);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Migración completada exitosamente.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en la migración:', error);
    } finally {
        client.release();
        pool.end(); // Cerrar conexión para terminar el script
    }
};

runMigration();
