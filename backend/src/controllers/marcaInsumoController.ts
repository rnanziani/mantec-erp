import { Request, Response } from 'express';
import { pool } from '../db.js';
import { MarcaInsumo, CreateMarcaInsumoDTO, UpdateMarcaInsumoDTO } from '../types.js';

export const getAllMarcasInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MarcaInsumo>(
      'SELECT id_marca_insumo_37, marca_insumo_37 FROM tbl_37_marca_insumo ORDER BY marca_insumo_37 ASC'
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las marcas de insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getMarcaInsumoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<MarcaInsumo>(
      'SELECT id_marca_insumo_37, marca_insumo_37 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de insumo no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la marca de insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createMarcaInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marca_insumo_37 }: CreateMarcaInsumoDTO = req.body;
    if (!marca_insumo_37 || marca_insumo_37.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la marca es requerido' });
      return;
    }
    const nombre = marca_insumo_37.trim();
    if (nombre.length > 100) {
      res.status(400).json({ success: false, error: 'La marca no puede exceder 100 caracteres' });
      return;
    }
    const existing = await pool.query(
      'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE LOWER(marca_insumo_37) = LOWER($1)',
      [nombre]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una marca con ese nombre' });
      return;
    }
    const result = await pool.query<MarcaInsumo>(
      'INSERT INTO tbl_37_marca_insumo (marca_insumo_37) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Marca de insumo creada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la marca de insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateMarcaInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { marca_insumo_37 }: UpdateMarcaInsumoDTO = req.body;
    if (!marca_insumo_37 || marca_insumo_37.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la marca es requerido' });
      return;
    }
    const nombre = marca_insumo_37.trim();
    if (nombre.length > 100) {
      res.status(400).json({ success: false, error: 'La marca no puede exceder 100 caracteres' });
      return;
    }
    const existing = await pool.query(
      'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE LOWER(marca_insumo_37) = LOWER($1) AND id_marca_insumo_37 <> $2',
      [nombre, id]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una marca con ese nombre' });
      return;
    }
    const result = await pool.query<MarcaInsumo>(
      'UPDATE tbl_37_marca_insumo SET marca_insumo_37 = $1 WHERE id_marca_insumo_37 = $2 RETURNING *',
      [nombre, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de insumo no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Marca de insumo actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la marca de insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteMarcaInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const inUse = await pool.query(
      'SELECT id_insumo_43 FROM tbl_43_insumo WHERE id_marca_insumo_43 = $1 LIMIT 1',
      [id]
    );
    if (inUse.rowCount && inUse.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar porque está siendo utilizada en insumos'
      });
      return;
    }
    const result = await pool.query(
      'DELETE FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1 RETURNING id_marca_insumo_37',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de insumo no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Marca de insumo eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la marca de insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
