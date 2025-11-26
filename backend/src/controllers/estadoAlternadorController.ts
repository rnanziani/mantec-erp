import { Request, Response } from 'express';
import { pool } from '../db.js';
import { EstadoAlternador, CreateEstadoAlternadorDTO, UpdateEstadoAlternadorDTO } from '../types.js';

/**
 * Obtener todos los estados de alternador
 */
export const getAllEstados = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<EstadoAlternador>(
      'SELECT id_estado_20, estado_20, descripcion_20 FROM tbl_20_estado_alternador ORDER BY id_estado_20 ASC'
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener estados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los estados de alternador',
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
    const result = await pool.query<EstadoAlternador>(
      'SELECT id_estado_20, estado_20, descripcion_20 FROM tbl_20_estado_alternador WHERE id_estado_20 = $1',
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
 * Crear un nuevo estado de alternador
 */
export const createEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado_20, descripcion_20 }: CreateEstadoAlternadorDTO = req.body;

    // Validación básica
    if (!estado_20 || estado_20.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del estado es requerido'
      });
      return;
    }

    // Validar duplicados (case-insensitive)
    const existingEstado = await pool.query(
      'SELECT id_estado_20 FROM tbl_20_estado_alternador WHERE LOWER(estado_20) = LOWER($1)',
      [estado_20.trim()]
    );

    if (existingEstado.rowCount && existingEstado.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un estado con ese nombre'
      });
      return;
    }

    const result = await pool.query<EstadoAlternador>(
      'INSERT INTO tbl_20_estado_alternador (estado_20, descripcion_20) VALUES ($1, $2) RETURNING *',
      [estado_20.trim(), descripcion_20?.trim() || null]
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
    const { estado_20, descripcion_20 }: UpdateEstadoAlternadorDTO = req.body;

    // Validación
    if (!estado_20 || estado_20.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del estado es requerido'
      });
      return;
    }

    // Validar duplicados (excluyendo el registro actual)
    const existingEstado = await pool.query(
      'SELECT id_estado_20 FROM tbl_20_estado_alternador WHERE LOWER(estado_20) = LOWER($1) AND id_estado_20 != $2',
      [estado_20.trim(), id]
    );

    if (existingEstado.rowCount && existingEstado.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe otro estado con ese nombre'
      });
      return;
    }

    const result = await pool.query<EstadoAlternador>(
      'UPDATE tbl_20_estado_alternador SET estado_20 = $1, descripcion_20 = $2 WHERE id_estado_20 = $3 RETURNING *',
      [estado_20.trim(), descripcion_20?.trim() || null, id]
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
      'DELETE FROM tbl_20_estado_alternador WHERE id_estado_20 = $1 RETURNING id_estado_20',
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
