import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Ccosto, CreateCcostoDTO, UpdateCcostoDTO } from '../types.js';

export const getAllCcostos = async (req: Request, res: Response): Promise<void> => {
  try {
    const activoOnly = req.query.activo === 'true';
    const sql = activoOnly
      ? 'SELECT id_ccosto_45, ccosto_45, activo_45, fecha_estado_45, usuario_estado_45 FROM tbl_45_ccosto WHERE activo_45 = true ORDER BY ccosto_45 ASC'
      : 'SELECT id_ccosto_45, ccosto_45, activo_45, fecha_estado_45, usuario_estado_45 FROM tbl_45_ccosto ORDER BY id_ccosto_45 ASC';
    const result = await pool.query<Ccosto>(sql);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener centros de costo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getCcostoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Ccosto>(
      'SELECT id_ccosto_45, ccosto_45, activo_45, fecha_estado_45, usuario_estado_45 FROM tbl_45_ccosto WHERE id_ccosto_45 = $1',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Centro de costo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el centro de costo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createCcosto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ccosto_45, activo_45 }: CreateCcostoDTO = req.body;
    if (!ccosto_45 || ccosto_45.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre del centro de costo es requerido' });
      return;
    }
    const existing = await pool.query(
      'SELECT id_ccosto_45 FROM tbl_45_ccosto WHERE LOWER(ccosto_45) = LOWER($1)',
      [ccosto_45.trim()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe un centro de costo con ese nombre' });
      return;
    }
    const activo = activo_45 !== false;
    const result = await pool.query<Ccosto>(
      'INSERT INTO tbl_45_ccosto (ccosto_45, activo_45) VALUES ($1, $2) RETURNING id_ccosto_45, ccosto_45, activo_45, fecha_estado_45, usuario_estado_45',
      [ccosto_45.trim(), activo]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Centro de costo creado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el centro de costo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateCcosto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ccosto_45, activo_45 }: UpdateCcostoDTO = req.body;
    if (!ccosto_45 || ccosto_45.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre del centro de costo es requerido' });
      return;
    }
    const activo = activo_45 !== false;
    const result = await pool.query<Ccosto>(
      `UPDATE tbl_45_ccosto SET ccosto_45 = $1, activo_45 = $2, fecha_estado_45 = CURRENT_TIMESTAMP, usuario_estado_45 = CURRENT_USER WHERE id_ccosto_45 = $3 RETURNING id_ccosto_45, ccosto_45, activo_45, fecha_estado_45, usuario_estado_45`,
      [ccosto_45.trim(), activo, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Centro de costo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Centro de costo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el centro de costo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteCcosto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tbl_45_ccosto WHERE id_ccosto_45 = $1 RETURNING id_ccosto_45', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Centro de costo no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Centro de costo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el centro de costo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

