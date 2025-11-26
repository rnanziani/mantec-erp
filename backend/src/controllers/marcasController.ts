import { Request, Response } from 'express';
import { pool } from '../db.js';
import { MarcaAlternador, CreateMarcaAlternadorDTO, UpdateMarcaAlternadorDTO } from '../types.js';

/**
 * Obtener todas las marcas de alternadores
 */
export const getAllMarcas = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MarcaAlternador>(
      'SELECT id_marca_18, marca_18 FROM tbl_18_marca_alternador ORDER BY id_marca_18 ASC'
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las marcas de alternadores',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener una marca por ID
 */
export const getMarcaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<MarcaAlternador>(
      'SELECT id_marca_18, marca_18 FROM tbl_18_marca_alternador WHERE id_marca_18 = $1',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Marca no encontrada'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la marca',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear una nueva marca
 */
export const createMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marca_18 }: CreateMarcaAlternadorDTO = req.body;

    // Validación básica
    if (!marca_18 || marca_18.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre de la marca es requerido'
      });
      return;
    }

    // Validar duplicados (case-insensitive)
    const existingMarca = await pool.query(
      'SELECT id_marca_18 FROM tbl_18_marca_alternador WHERE LOWER(marca_18) = LOWER($1)',
      [marca_18.trim()]
    );

    if (existingMarca.rowCount && existingMarca.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe una marca con ese nombre'
      });
      return;
    }

    const result = await pool.query<MarcaAlternador>(
      'INSERT INTO tbl_18_marca_alternador (marca_18) VALUES ($1) RETURNING *',
      [marca_18.trim()]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Marca creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la marca',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar una marca existente
 */
export const updateMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { marca_18 }: UpdateMarcaAlternadorDTO = req.body;

    // Validación
    if (!marca_18 || marca_18.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El nombre de la marca es requerido'
      });
      return;
    }

    const result = await pool.query<MarcaAlternador>(
      'UPDATE tbl_18_marca_alternador SET marca_18 = $1 WHERE id_marca_18 = $2 RETURNING *',
      [marca_18.trim(), id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Marca no encontrada'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Marca actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la marca',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar una marca
 */
export const deleteMarca = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_18_marca_alternador WHERE id_marca_18 = $1 RETURNING id_marca_18',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Marca no encontrada'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Marca eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la marca',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
