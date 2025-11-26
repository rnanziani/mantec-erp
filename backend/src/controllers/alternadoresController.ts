import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Alternador, CreateAlternadorDTO, UpdateAlternadorDTO } from '../types.js';

/**
 * Obtener todos los alternadores con información de marca
 */
export const getAllAlternadores = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Alternador>(
      `SELECT 
        a.id_alternador_19, 
        a.cod_alternador_19, 
        a.id_marca_19,
        m.marca_18
       FROM tbl_19_alternador a
       INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
       ORDER BY a.id_alternador_19 ASC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener alternadores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los alternadores',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un alternador por ID con información de marca
 */
export const getAlternadorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Alternador>(
      `SELECT 
        a.id_alternador_19, 
        a.cod_alternador_19, 
        a.id_marca_19,
        m.marca_18
       FROM tbl_19_alternador a
       INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
       WHERE a.id_alternador_19 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Alternador no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener alternador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un nuevo alternador
 * El código se genera automáticamente por el trigger
 */
export const createAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_marca_19 }: CreateAlternadorDTO = req.body;

    // Validación
    if (!id_marca_19) {
      res.status(400).json({
        success: false,
        error: 'El ID de la marca es requerido'
      });
      return;
    }

    // Verificar que la marca existe
    const marcaExists = await pool.query(
      'SELECT id_marca_18 FROM tbl_18_marca_alternador WHERE id_marca_18 = $1',
      [id_marca_19]
    );

    if (marcaExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'La marca seleccionada no existe'
      });
      return;
    }

    // Insertar alternador (el código se genera automáticamente por trigger)
    const result = await pool.query<Alternador>(
      `INSERT INTO tbl_19_alternador (id_marca_19) 
       VALUES ($1) 
       RETURNING id_alternador_19, cod_alternador_19, id_marca_19`,
      [id_marca_19]
    );

    // Obtener el alternador completo con la marca
    const alternadorCompleto = await pool.query<Alternador>(
      `SELECT 
        a.id_alternador_19, 
        a.cod_alternador_19, 
        a.id_marca_19,
        m.marca_18
       FROM tbl_19_alternador a
       INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
       WHERE a.id_alternador_19 = $1`,
      [result.rows[0].id_alternador_19]
    );

    res.status(201).json({
      success: true,
      data: alternadorCompleto.rows[0],
      message: 'Alternador creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear alternador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un alternador existente
 */
export const updateAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { id_marca_19 }: UpdateAlternadorDTO = req.body;

    // Validación
    if (!id_marca_19) {
      res.status(400).json({
        success: false,
        error: 'El ID de la marca es requerido'
      });
      return;
    }

    // Verificar que la marca existe
    const marcaExists = await pool.query(
      'SELECT id_marca_18 FROM tbl_18_marca_alternador WHERE id_marca_18 = $1',
      [id_marca_19]
    );

    if (marcaExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'La marca seleccionada no existe'
      });
      return;
    }

    const result = await pool.query(
      'UPDATE tbl_19_alternador SET id_marca_19 = $1 WHERE id_alternador_19 = $2 RETURNING id_alternador_19',
      [id_marca_19, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Alternador no encontrado'
      });
      return;
    }

    // Obtener el alternador actualizado con la marca
    const alternadorActualizado = await pool.query<Alternador>(
      `SELECT 
        a.id_alternador_19, 
        a.cod_alternador_19, 
        a.id_marca_19,
        m.marca_18
       FROM tbl_19_alternador a
       INNER JOIN tbl_18_marca_alternador m ON a.id_marca_19 = m.id_marca_18
       WHERE a.id_alternador_19 = $1`,
      [id]
    );

    res.json({
      success: true,
      data: alternadorActualizado.rows[0],
      message: 'Alternador actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar alternador:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un alternador
 */
export const deleteAlternador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_19_alternador WHERE id_alternador_19 = $1 RETURNING id_alternador_19',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Alternador no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Alternador eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar alternador:', error);

    // Verificar si es un error de FK constraint
    if (error instanceof Error && error.message.includes('foreign key')) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar el alternador porque tiene datos relacionados'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error al eliminar el alternador',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
