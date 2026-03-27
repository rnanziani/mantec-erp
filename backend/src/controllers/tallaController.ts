import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Talla, CreateTallaDTO, UpdateTallaDTO, ApiResponse } from '../types.js';

const TABLA = 'tbl_16_tallas';
const TIPOS_PERMITIDOS = new Set(['alfabetica', 'numerica']);

const normalizeTipo = (raw: unknown): string | null => {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  return TIPOS_PERMITIDOS.has(s) ? s : '__invalid__';
};

export const getAllTallas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT id_16, talla_16, tipo_16
      FROM ${TABLA}
      ORDER BY tipo_16 NULLS LAST, talla_16 ASC
    `;
    const result = await pool.query<Talla>(query);
    const response: ApiResponse<Talla[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  } catch (error) {
    console.error('Error al obtener tallas:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Error al obtener las tallas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
    res.status(500).json(response);
  }
};

export const getTallaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Talla>(
      `SELECT id_16, talla_16, tipo_16 FROM ${TABLA} WHERE id_16 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Talla no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la talla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createTalla = async (req: Request, res: Response): Promise<void> => {
  try {
    const { talla_16, tipo_16 }: CreateTallaDTO = req.body;
    if (!talla_16 || String(talla_16).trim() === '') {
      res.status(400).json({ success: false, error: 'La talla es requerida' });
      return;
    }
    const talla = String(talla_16).trim();
    const tipoNorm = normalizeTipo(tipo_16);
    if (tipoNorm === '__invalid__') {
      res.status(400).json({
        success: false,
        error: 'El tipo debe ser "alfabetica", "numerica" o vacío'
      });
      return;
    }

    const dup = await pool.query(`SELECT id_16 FROM ${TABLA} WHERE LOWER(talla_16) = LOWER($1)`, [talla]);
    if (dup.rowCount && dup.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una talla con ese valor' });
      return;
    }

    const result = await pool.query<Talla>(
      `INSERT INTO ${TABLA} (talla_16, tipo_16) VALUES ($1, $2) RETURNING id_16, talla_16, tipo_16`,
      [talla, tipoNorm]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Talla creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear talla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la talla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateTalla = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { talla_16, tipo_16 }: UpdateTallaDTO = req.body;
    if (!talla_16 || String(talla_16).trim() === '') {
      res.status(400).json({ success: false, error: 'La talla es requerida' });
      return;
    }
    const talla = String(talla_16).trim();
    const tipoNorm = normalizeTipo(tipo_16);
    if (tipoNorm === '__invalid__') {
      res.status(400).json({
        success: false,
        error: 'El tipo debe ser "alfabetica", "numerica" o vacío'
      });
      return;
    }

    const otra = await pool.query(
      `SELECT id_16 FROM ${TABLA} WHERE LOWER(talla_16) = LOWER($1) AND id_16 <> $2`,
      [talla, id]
    );
    if (otra.rowCount && otra.rowCount > 0) {
      res.status(400).json({ success: false, error: 'Ya existe otra talla con ese valor' });
      return;
    }

    const result = await pool.query<Talla>(
      `UPDATE ${TABLA} SET talla_16 = $1, tipo_16 = $2 WHERE id_16 = $3 RETURNING id_16, talla_16, tipo_16`,
      [talla, tipoNorm, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Talla no encontrada' });
      return;
    }
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Talla actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar talla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la talla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteTalla = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${TABLA} WHERE id_16 = $1 RETURNING id_16`, [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Talla no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Talla eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar talla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la talla',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
