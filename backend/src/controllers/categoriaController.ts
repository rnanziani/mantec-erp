import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Categoria, CreateCategoriaDTO, UpdateCategoriaDTO } from '../types.js';

export const getAllCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Categoria>(
      'SELECT id_categoria_42, categoria_42 FROM tbl_42_categoria ORDER BY categoria_42 ASC'
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las categorías',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getCategoriaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Categoria>(
      'SELECT id_categoria_42, categoria_42 FROM tbl_42_categoria WHERE id_categoria_42 = $1',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la categoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria_42 }: CreateCategoriaDTO = req.body;
    if (!categoria_42 || categoria_42.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la categoría es requerido' });
      return;
    }
    const existing = await pool.query(
      'SELECT id_categoria_42 FROM tbl_42_categoria WHERE LOWER(categoria_42) = LOWER($1)',
      [categoria_42.trim()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    const result = await pool.query<Categoria>(
      'INSERT INTO tbl_42_categoria (categoria_42) VALUES ($1) RETURNING *',
      [categoria_42.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Categoría creada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la categoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { categoria_42 }: UpdateCategoriaDTO = req.body;
    if (!categoria_42 || categoria_42.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la categoría es requerido' });
      return;
    }
    const result = await pool.query<Categoria>(
      'UPDATE tbl_42_categoria SET categoria_42 = $1 WHERE id_categoria_42 = $2 RETURNING *',
      [categoria_42.trim(), id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Categoría actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la categoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tbl_42_categoria WHERE id_categoria_42 = $1 RETURNING id_categoria_42', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la categoría',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

