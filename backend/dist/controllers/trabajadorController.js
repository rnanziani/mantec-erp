import { pool } from '../db.js';
/**
 * Obtener todos los trabajadores
 */
export const getAllTrabajadores = async (req, res) => {
    try {
        const query = `
      SELECT 
        t.idTrabajador_06,
        t.rutTrabajador_06,
        t.Nombre_06,
        t.aPaterno_06,
        t.aMaterno_06,
        t.estado_06,
        t.idcargo_06,
        c.cargo_14 AS nombre_cargo
      FROM tbl_06_trabajador t
      LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
      WHERE t.estado_06 = true
      ORDER BY t.Nombre_06 ASC
    `;
        const result = await pool.query(query);
        const response = {
            success: true,
            data: result.rows
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener trabajadores:', error);
        const response = {
            success: false,
            error: 'Error al obtener los trabajadores',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
