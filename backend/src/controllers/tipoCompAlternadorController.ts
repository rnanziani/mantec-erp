import { Request, Response } from 'express';
import { pool } from '../db.js';
import { TipoCompAlternador, CreateTipoCompAlternadorDTO, UpdateTipoCompAlternadorDTO } from '../types.js';

/**
 * Obtener todos los tipos de componente alternador
 */
export const getAllTipoCompAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<TipoCompAlternador>(
      `SELECT 
        id_tipo_comp_alternador_32,
        tipo_comp_alternador_32
       FROM tbl_32_tipo_comp_alternador 
       ORDER BY id_tipo_comp_alternador_32 ASC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener tipos de componente alternador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los tipos de componente alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un tipo de componente alternador por ID
 */
export const getTipoCompAlternadorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<TipoCompAlternador>(
      `SELECT 
        id_tipo_comp_alternador_32,
        tipo_comp_alternador_32
       FROM tbl_32_tipo_comp_alternador 
       WHERE id_tipo_comp_alternador_32 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Tipo de componente alternador no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener tipo de componente alternador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el tipo de componente alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un nuevo tipo de componente alternador
 */
export const createTipoCompAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_tipo_comp_alternador_32, tipo_comp_alternador_32 }: CreateTipoCompAlternadorDTO = req.body;

    // Validación básica
    if (!id_tipo_comp_alternador_32) {
      res.status(400).json({
        success: false,
        error: 'El ID del tipo de componente es requerido'
      });
      return;
    }

    if (!tipo_comp_alternador_32 || tipo_comp_alternador_32.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del tipo de componente es requerido'
      });
      return;
    }

    // Validar duplicados (case-insensitive)
    const existingTipo = await pool.query(
      'SELECT id_tipo_comp_alternador_32 FROM tbl_32_tipo_comp_alternador WHERE LOWER(tipo_comp_alternador_32) = LOWER($1)',
      [tipo_comp_alternador_32.trim()]
    );

    if (existingTipo.rowCount && existingTipo.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un tipo de componente con ese nombre'
      });
      return;
    }

    // Validar que el ID no exista
    const existingId = await pool.query(
      'SELECT id_tipo_comp_alternador_32 FROM tbl_32_tipo_comp_alternador WHERE id_tipo_comp_alternador_32 = $1',
      [id_tipo_comp_alternador_32]
    );

    if (existingId.rowCount && existingId.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un tipo de componente con ese ID'
      });
      return;
    }

    const result = await pool.query<TipoCompAlternador>(
      'INSERT INTO tbl_32_tipo_comp_alternador (id_tipo_comp_alternador_32, tipo_comp_alternador_32) VALUES ($1, $2) RETURNING *',
      [id_tipo_comp_alternador_32, tipo_comp_alternador_32.trim()]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Tipo de componente creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear tipo de componente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el tipo de componente',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un tipo de componente alternador existente
 */
export const updateTipoCompAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tipo_comp_alternador_32 }: UpdateTipoCompAlternadorDTO = req.body;

    // Validación
    if (!tipo_comp_alternador_32 || tipo_comp_alternador_32.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre del tipo de componente es requerido'
      });
      return;
    }

    // Validar duplicados (excluyendo el registro actual)
    const existingTipo = await pool.query(
      'SELECT id_tipo_comp_alternador_32 FROM tbl_32_tipo_comp_alternador WHERE LOWER(tipo_comp_alternador_32) = LOWER($1) AND id_tipo_comp_alternador_32 != $2',
      [tipo_comp_alternador_32.trim(), id]
    );

    if (existingTipo.rowCount && existingTipo.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe un tipo de componente con ese nombre'
      });
      return;
    }

    const result = await pool.query<TipoCompAlternador>(
      'UPDATE tbl_32_tipo_comp_alternador SET tipo_comp_alternador_32 = $1 WHERE id_tipo_comp_alternador_32 = $2 RETURNING *',
      [tipo_comp_alternador_32.trim(), id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Tipo de componente no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Tipo de componente actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar tipo de componente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el tipo de componente',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un tipo de componente alternador
 */
export const deleteTipoCompAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_32_tipo_comp_alternador WHERE id_tipo_comp_alternador_32 = $1 RETURNING id_tipo_comp_alternador_32',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Tipo de componente no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Tipo de componente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar tipo de componente:', error);

    // Verificar si es un error de FK constraint
    if (error instanceof Error && error.message.includes('foreign key')) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar el tipo de componente porque tiene datos relacionados'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error al eliminar el tipo de componente',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

