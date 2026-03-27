import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Llanta, CreateLlantaDTO, UpdateLlantaDTO, ApiResponse } from '../types.js';

const TABLA = 'tbl_36_llanta';

export const getAllLlantas = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Llanta>(
      `SELECT id_llanta_36, descripcion_llanta_36 FROM ${TABLA} ORDER BY descripcion_llanta_36 ASC`
    );
    const response: ApiResponse<Llanta[]> = {
      success: true,
      data: result.rows,
      count: result.rowCount ?? undefined
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener llantas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las llantas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

export const getLlantaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Llanta>(
      `SELECT id_llanta_36, descripcion_llanta_36 FROM ${TABLA} WHERE id_llanta_36 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Llanta no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la llanta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { descripcion_llanta_36 }: CreateLlantaDTO = req.body;
    const desc = descripcion_llanta_36 != null ? String(descripcion_llanta_36).trim() : '';
    if (!desc) {
      res.status(400).json({ success: false, error: 'La descripción es requerida' });
      return;
    }

    const dup = await pool.query(
      `SELECT id_llanta_36 FROM ${TABLA} WHERE LOWER(descripcion_llanta_36) = LOWER($1)`,
      [desc]
    );
    if (dup.rowCount && dup.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una llanta con esa descripción' });
      return;
    }

    const result = await pool.query<Llanta>(
      `INSERT INTO ${TABLA} (descripcion_llanta_36) VALUES ($1) RETURNING id_llanta_36, descripcion_llanta_36`,
      [desc]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Llanta creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear llanta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la llanta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { descripcion_llanta_36 }: UpdateLlantaDTO = req.body;
    const desc = descripcion_llanta_36 != null ? String(descripcion_llanta_36).trim() : '';
    if (!desc) {
      res.status(400).json({ success: false, error: 'La descripción es requerida' });
      return;
    }

    const otra = await pool.query(
      `SELECT id_llanta_36 FROM ${TABLA} WHERE LOWER(descripcion_llanta_36) = LOWER($1) AND id_llanta_36 <> $2`,
      [desc, id]
    );
    if (otra.rowCount && otra.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe otra llanta con esa descripción' });
      return;
    }

    const result = await pool.query<Llanta>(
      `UPDATE ${TABLA} SET descripcion_llanta_36 = $1 WHERE id_llanta_36 = $2 RETURNING id_llanta_36, descripcion_llanta_36`,
      [desc, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Llanta no encontrada' });
      return;
    }
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Llanta actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar llanta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la llanta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${TABLA} WHERE id_llanta_36 = $1 RETURNING id_llanta_36`, [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Llanta no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Llanta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar llanta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la llanta',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
