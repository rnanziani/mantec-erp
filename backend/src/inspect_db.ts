import { pool } from './db.js';

const inspectTable = async (tableName: string) => {
    try {
        const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1;
    `;
        const res = await pool.query(query, [tableName]);
        console.log(`Columns for ${tableName}:`);
        console.table(res.rows);
    } catch (err) {
        console.error(`Error inspecting ${tableName}:`, err);
    }
};

const main = async () => {
    await inspectTable('tbl_14_cargo');
    process.exit(0);
};

main();
