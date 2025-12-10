import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

interface Trabajador {
  idTrabajador_06: number;
  rutTrabajador_06: string;
  Nombre_06: string;
  aPaterno_06: string;
  aMaterno_06: string;
  estado_06: boolean;
  idcargo_06?: number;
  nombre_cargo?: string;
}

/**
 * Obtener todos los trabajadores
 */
export const getAllTrabajadores = async (req: Request, res: Response): Promise<void> => {
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

    const result = await pool.query<Trabajador>(query);

    const response: ApiResponse<Trabajador[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener trabajadores:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los trabajadores',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};


