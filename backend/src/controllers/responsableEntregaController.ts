import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse } from '../types.js';

const TABLA_RESPONSABLE = 'tbl_08_responsable_entrega';

interface ResponsableEntrega {
  idresponsableentrega_08: number;
  nombreresponsableentrega_08: string;
  apaternoresponsableentrega_08?: string;
  amaternoresponsableentrega_08?: string;
  nombre_completo?: string;
}

const mapRowToResponsable = (row: any): ResponsableEntrega => {
  const nombre = row.nombreresponsableentrega_08 || '';
  const apaterno = row.apaternoresponsableentrega_08 || '';
  const amaterno = row.amaternoresponsableentrega_08 || '';
  const nombreCompleto = [nombre, apaterno, amaterno]
    .filter(part => part.trim() !== '')
    .join(' ')
    .trim();
  return {
    idresponsableentrega_08: row.idresponsableentrega_08,
    nombreresponsableentrega_08: nombre,
    apaternoresponsableentrega_08: apaterno,
    amaternoresponsableentrega_08: amaterno,
    nombre_completo: nombreCompleto || nombre
  };
};

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
      FROM ${TABLA_RESPONSABLE}
      ORDER BY nombreresponsableentrega_08 ASC
    `;

    const result = await pool.query(query);
    const responsables = result.rows.map(mapRowToResponsable);

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

/**
 * Obtener un responsable por ID
 */
export const getResponsableById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT idresponsableentrega_08, nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08
       FROM ${TABLA_RESPONSABLE} WHERE idresponsableentrega_08 = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }
    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0])
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un responsable de entrega
 */
export const createResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08 } = req.body;

    if (!nombreresponsableentrega_08 || !nombreresponsableentrega_08.trim()) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO ${TABLA_RESPONSABLE} (nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08)
       VALUES ($1, $2, $3)
       RETURNING idresponsableentrega_08, nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08`,
      [
        nombreresponsableentrega_08.trim(),
        apaternoresponsableentrega_08?.trim() || null,
        amaternoresponsableentrega_08?.trim() || null
      ]
    );

    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0]),
      message: 'Responsable creado exitosamente'
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un responsable de entrega
 */
export const updateResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08 } = req.body;

    if (!nombreresponsableentrega_08 || !nombreresponsableentrega_08.trim()) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
      return;
    }

    const result = await pool.query(
      `UPDATE ${TABLA_RESPONSABLE}
       SET nombreresponsableentrega_08 = $1, apaternoresponsableentrega_08 = $2, amaternoresponsableentrega_08 = $3
       WHERE idresponsableentrega_08 = $4
       RETURNING idresponsableentrega_08, nombreresponsableentrega_08, apaternoresponsableentrega_08, amaternoresponsableentrega_08`,
      [
        nombreresponsableentrega_08.trim(),
        apaternoresponsableentrega_08?.trim() || null,
        amaternoresponsableentrega_08?.trim() || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }

    const response: ApiResponse<ResponsableEntrega> = {
      success: true,
      data: mapRowToResponsable(result.rows[0]),
      message: 'Responsable actualizado exitosamente'
    };
    res.json(response);
  } catch (error) {
    console.error('Error al actualizar responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un responsable de entrega
 */
export const deleteResponsable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar si está en uso en asignación de prendas
    const checkPrendas = await pool.query(
      'SELECT idasignacionmain_09 FROM tbl_09_asignacion_main WHERE idresponsableentrega_09 = $1 LIMIT 1',
      [id]
    );
    if (checkPrendas.rowCount && checkPrendas.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar porque está siendo utilizado en asignaciones de prendas'
      });
      return;
    }    // Verificar si está en uso en asignación de productos aseo
    const checkAseo = await pool.query(
      'SELECT idproductomain_12 FROM tbl_12_productomain WHERE idresponsableentrega_12 = $1 LIMIT 1',
      [id]
    );
    if (checkAseo.rowCount && checkAseo.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar porque está siendo utilizado en asignaciones de productos de aseo'
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA_RESPONSABLE} WHERE idresponsableentrega_08 = $1 RETURNING idresponsableentrega_08`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Responsable no encontrado' });
      return;
    }

    res.json({
      success: true,
      message: 'Responsable eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar responsable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el responsable',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
