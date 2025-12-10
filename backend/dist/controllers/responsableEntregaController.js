import { pool } from '../db.js';
/**
 * Obtener todos los responsables de entrega
 */
export const getAllResponsables = async (req, res) => {
    try {
        // Primero intentamos obtener solo el nombre básico
        let query = `
      SELECT 
        idresponsableentrega_08,
        nombreresponsableentrega_08,
        rutresponsableentrega_08
      FROM tbl_08_responsable_entrega
      ORDER BY nombreresponsableentrega_08 ASC
    `;
        const result = await pool.query(query);
        // Mapear los resultados y crear nombre_completo
        const responsables = result.rows.map((row) => ({
            idresponsableentrega_08: row.idresponsableentrega_08,
            nombreresponsableentrega_08: row.nombreresponsableentrega_08 || '',
            rutresponsableentrega_08: row.rutresponsableentrega_08 || '',
            nombre_completo: row.nombreresponsableentrega_08 || ''
        }));
        const response = {
            success: true,
            data: responsables
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error al obtener responsables:', error);
        const response = {
            success: false,
            error: 'Error al obtener los responsables',
            message: error instanceof Error ? error.message : 'Error desconocido'
        };
        res.status(500).json(response);
    }
};
