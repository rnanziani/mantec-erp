import { Request, Response } from 'express';
import { pool } from '../db.js';
import { EstadoNeumatico, CreateEstadoNeumaticoDTO, UpdateEstadoNeumaticoDTO } from '../types.js';

/**
 * Obtener todos los estados de neumático
 */
export const getAllEstados = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<EstadoNeumatico>(
      `SELECT id_estado_33, estado_33, descripcion_33, activo_33, orden_33, color_33, fecha_creacion_33
       FROM tbl_33_estado_neumatico
       ORDER BY orden_33 ASC, id_estado_33 ASC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener estados de neumático:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los estados de neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un estado por ID
 */
export const getEstadoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<EstadoNeumatico>(
      `SELECT id_estado_33, estado_33, descripcion_33, activo_33, orden_33, color_33, fecha_creacion_33
       FROM tbl_33_estado_neumatico
       WHERE id_estado_33 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Estado no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el estado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un nuevo estado de neumático
 */
export const createEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado_33, descripcion_33, activo_33, orden_33, color_33 }: CreateEstadoNeumaticoDTO = req.body;

    if (!estado_33 || estado_33.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del estado es requerido'
      });
      return;
    }

    const existingEstado = await pool.query(
      'SELECT id_estado_33 FROM tbl_33_estado_neumatico WHERE LOWER(estado_33) = LOWER($1)',
      [estado_33.trim()]
    );

    if (existingEstado.rowCount && existingEstado.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un estado con ese nombre'
      });
      return;
    }

    const orden = orden_33 != null && !isNaN(Number(orden_33)) ? Number(orden_33) : 0;
    const activo = activo_33 !== false;

    const result = await pool.query<EstadoNeumatico>(
      `INSERT INTO tbl_33_estado_neumatico (estado_33, descripcion_33, activo_33, orden_33, color_33)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [estado_33.trim().toUpperCase(), descripcion_33?.trim() || null, activo, orden, color_33?.trim() || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Estado creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el estado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un estado existente
 */
export const updateEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado_33, descripcion_33, activo_33, orden_33, color_33 }: UpdateEstadoNeumaticoDTO = req.body;

    if (!estado_33 || estado_33.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del estado es requerido'
      });
      return;
    }

    const existingEstado = await pool.query(
      'SELECT id_estado_33 FROM tbl_33_estado_neumatico WHERE LOWER(estado_33) = LOWER($1) AND id_estado_33 != $2',
      [estado_33.trim(), id]
    );

    if (existingEstado.rowCount && existingEstado.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe otro estado con ese nombre'
      });
      return;
    }

    const orden = orden_33 != null && !isNaN(Number(orden_33)) ? Number(orden_33) : 0;
    const activo = activo_33 !== false;

    const result = await pool.query<EstadoNeumatico>(
      `UPDATE tbl_33_estado_neumatico
       SET estado_33 = $1, descripcion_33 = $2, activo_33 = $3, orden_33 = $4, color_33 = $5
       WHERE id_estado_33 = $6 RETURNING *`,
      [estado_33.trim().toUpperCase(), descripcion_33?.trim() || null, activo, orden, color_33?.trim() || null, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Estado no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Estado actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el estado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un estado
 */
export const deleteEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_33_estado_neumatico WHERE id_estado_33 = $1 RETURNING id_estado_33',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Estado no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Estado eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el estado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
