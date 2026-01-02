import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

interface Empresa {
  idempresa_15: number;
  nombreempresa_15: string;
}

/**
 * Obtener todas las empresas
 */
export const getAllEmpresas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        idempresa_15,
        nombreempresa_15
      FROM tbl_15_empresas
      ORDER BY nombreempresa_15 ASC
    `;

    const result = await pool.query<Empresa>(query);

    const response: ApiResponse<Empresa[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las empresas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};


























































