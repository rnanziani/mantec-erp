import { Request, Response } from 'express';
import { pool } from '../db.js';
import { MarcaNeumatico, CreateMarcaNeumaticoDTO, UpdateMarcaNeumaticoDTO } from '../types.js';

export const getAllMarcasNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const activoOnly = req.query.activo === 'true';
    const sql = activoOnly
      ? 'SELECT id_marca_32, marca_32, diametro_32, estado_32, fecha_creacion_32 FROM tbl_32_marca_neumatico WHERE estado_32 = true ORDER BY marca_32 ASC'
      : 'SELECT id_marca_32, marca_32, diametro_32, estado_32, fecha_creacion_32 FROM tbl_32_marca_neumatico ORDER BY id_marca_32 ASC';
    const result = await pool.query<MarcaNeumatico>(sql);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las marcas de neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getMarcaNeumaticoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<MarcaNeumatico>(
      'SELECT id_marca_32, marca_32, diametro_32, estado_32, fecha_creacion_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de neumático no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la marca de neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createMarcaNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marca_32, diametro_32, estado_32 }: CreateMarcaNeumaticoDTO = req.body;
    if (!marca_32 || marca_32.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la marca es requerido' });
      return;
    }
    if (diametro_32 == null || diametro_32 < 0) {
      res.status(400).json({ success: false, error: 'El diámetro es requerido y debe ser un número positivo' });
      return;
    }
    const existing = await pool.query(
      'SELECT id_marca_32 FROM tbl_32_marca_neumatico WHERE LOWER(marca_32) = LOWER($1)',
      [marca_32.trim()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una marca de neumático con ese nombre' });
      return;
    }
    const estado = estado_32 !== false;
    const result = await pool.query<MarcaNeumatico>(
      'INSERT INTO tbl_32_marca_neumatico (marca_32, diametro_32, estado_32) VALUES ($1, $2, $3) RETURNING *',
      [marca_32.trim(), diametro_32, estado]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Marca de neumático creada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la marca de neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateMarcaNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { marca_32, diametro_32, estado_32 }: UpdateMarcaNeumaticoDTO = req.body;
    if (!marca_32 || marca_32.trim() === '') {
      res.status(400).json({ success: false, error: 'El nombre de la marca es requerido' });
      return;
    }
    if (diametro_32 == null || diametro_32 < 0) {
      res.status(400).json({ success: false, error: 'El diámetro es requerido y debe ser un número positivo' });
      return;
    }
    const estado = estado_32 !== false;
    const result = await pool.query<MarcaNeumatico>(
      'UPDATE tbl_32_marca_neumatico SET marca_32 = $1, diametro_32 = $2, estado_32 = $3 WHERE id_marca_32 = $4 RETURNING *',
      [marca_32.trim(), diametro_32, estado, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de neumático no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Marca de neumático actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la marca de neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteMarcaNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1 RETURNING id_marca_32', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Marca de neumático no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Marca de neumático eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la marca de neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
