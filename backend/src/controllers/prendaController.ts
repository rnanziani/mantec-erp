import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Prenda, CreatePrendaDTO, UpdatePrendaDTO, ApiResponse } from '../types.js';

const TABLA = 'tbl_07_prenda';

const normalizePrenda = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toUpperCase();
  return s === '' ? null : s;
};

export const getAllPrendas = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT idprenda_07, prenda_07
      FROM ${TABLA}
      ORDER BY prenda_07 ASC
    `;

    const result = await pool.query<Prenda>(query);

    const response: ApiResponse<Prenda[]> = {
      success: true,
      data: result.rows
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener prendas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las prendas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    } satisfies ApiResponse<null>);
  }
};

export const getPrendaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Prenda>(
      `SELECT idprenda_07, prenda_07 FROM ${TABLA} WHERE idprenda_07 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Prenda no encontrada' } satisfies ApiResponse<null>);
      return;
    }

    res.json({ success: true, data: result.rows[0] } satisfies ApiResponse<Prenda>);
  } catch (error) {
    console.error('Error al obtener la prenda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la prenda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    } satisfies ApiResponse<null>);
  }
};

export const createPrenda = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prenda_07 }: CreatePrendaDTO = req.body;
    const prendaNorm = normalizePrenda(prenda_07);

    if (!prendaNorm) {
      res.status(400).json({ success: false, error: 'La prenda es requerida' } satisfies ApiResponse<null>);
      return;
    }

    const dup = await pool.query<{ idprenda_07: number }>(
      `SELECT idprenda_07 FROM ${TABLA} WHERE LOWER(prenda_07) = LOWER($1)`,
      [prendaNorm]
    );

    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe una prenda con ese valor'
      } satisfies ApiResponse<null>);
      return;
    }

    const result = await pool.query<Prenda>(
      `INSERT INTO ${TABLA} (prenda_07) VALUES ($1) RETURNING idprenda_07, prenda_07`,
      [prendaNorm]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Prenda creada exitosamente'
    } satisfies ApiResponse<Prenda>);
  } catch (error) {
    console.error('Error al crear prenda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la prenda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    } satisfies ApiResponse<null>);
  }
};

export const updatePrenda = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { prenda_07 }: UpdatePrendaDTO = req.body;
    const prendaNorm = normalizePrenda(prenda_07);

    if (!prendaNorm) {
      res.status(400).json({ success: false, error: 'La prenda es requerida' } satisfies ApiResponse<null>);
      return;
    }

    const otra = await pool.query<{ idprenda_07: number }>(
      `SELECT idprenda_07 FROM ${TABLA} WHERE LOWER(prenda_07) = LOWER($1) AND idprenda_07 <> $2`,
      [prendaNorm, id]
    );

    if ((otra.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe otra prenda con ese valor'
      } satisfies ApiResponse<null>);
      return;
    }

    const result = await pool.query<Prenda>(
      `UPDATE ${TABLA} SET prenda_07 = $1 WHERE idprenda_07 = $2 RETURNING idprenda_07, prenda_07`,
      [prendaNorm, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Prenda no encontrada' } satisfies ApiResponse<null>);
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Prenda actualizada exitosamente'
    } satisfies ApiResponse<Prenda>);
  } catch (error) {
    console.error('Error al actualizar prenda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la prenda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    } satisfies ApiResponse<null>);
  }
};

export const deletePrenda = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<{ idprenda_07: number }>(
      `DELETE FROM ${TABLA} WHERE idprenda_07 = $1 RETURNING idprenda_07`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Prenda no encontrada' } satisfies ApiResponse<null>);
      return;
    }

    res.json({ success: true, message: 'Prenda eliminada exitosamente' } satisfies ApiResponse<null>);
  } catch (error) {
    console.error('Error al eliminar prenda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la prenda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    } satisfies ApiResponse<null>);
  }
};

