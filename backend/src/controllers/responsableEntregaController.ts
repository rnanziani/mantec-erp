import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

interface ResponsableEntrega {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  nombre_completo?: string;
}

/**
 * Obtener todos los responsables de entrega
 */
export const getAllResponsables = async (req: Request, res: Response): Promise<void> => {
  try {
    // Consulta SQL con los campos correctos de la tabla
    const query = `
      SELECT 
        idresponsableentrega_08,
        nombreresponsableentrega_08,
        apaternoresponsableentrega_08,
        amaternoresponsableentrega_08
      FROM tbl_08_responsable_entrega
      ORDER BY nombreresponsableentrega_08 ASC
    `;

    const result = await pool.query(query);
    
    // Mapear los resultados y crear nombre_completo concatenando los campos
    const responsables = result.rows.map((row: any) => {
      const nombre = row.nombreresponsableentrega_08 || '';
      const apaterno = row.apaternoresponsableentrega_08 || '';
      const amaterno = row.amaternoresponsableentrega_08 || '';
      
      // Construir nombre completo: nombre + apellido paterno + apellido materno
      const nombreCompleto = [nombre, apaterno, amaterno]
        .filter(part => part.trim() !== '')
        .join(' ')
        .trim();
      
      return {
        idresponsableentrega_08: row.idresponsableentrega_08,
        nombreresponsableentrega_08: nombre,
        apaternoresponsableentrega_08: apaterno,
        amaternoresponsableentrega_08: amaterno,
        nombre_completo: nombreCompleto || nombre // Si no hay apellidos, usar solo el nombre
      };
    });

    const response: ApiResponse<ResponsableEntrega[]> = {
      success: true,
      data: responsables
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener responsables:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener los responsables',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

