import { Request, Response } from 'express';
import { pool } from '../db.js';

interface Cargo {
    idcargo_14: number;
    nombrecargo_14: string;
}

/**
 * Obtener todos los cargos
 */
export const getAllCargos = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
      SELECT 
        idcargo_14,
        cargo_14 as nombrecargo_14
      FROM tbl_14_cargo
      ORDER BY cargo_14 ASC
    `;

        const result = await pool.query<Cargo>(query);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error al obtener cargos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los cargos',
            message: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
