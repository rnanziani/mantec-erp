import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  ClaseElementoEpp,
  CreateClaseElementoEppDTO,
  UpdateClaseElementoEppDTO,
} from '../types.js';

const TABLA = 'tbl_56_clase_elemento';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

export const getAllClasesEpp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<ClaseElementoEpp>(
      `SELECT idclase_56, clase_56, descripcion_56, activo_56, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY clase_56 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener clases de elemento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getClaseEppById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<ClaseElementoEpp>(
      `SELECT idclase_56, clase_56, descripcion_56, activo_56, creado_en, actualizado_en
       FROM ${TABLA}
       WHERE idclase_56 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Clase de elemento no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la clase de elemento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createClaseEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateClaseElementoEppDTO = req.body;
    const clase = normalizeText(body.clase_56);
    if (!clase) {
      res.status(400).json({ success: false, error: 'La clase es requerida' });
      return;
    }

    const dup = await pool.query(`SELECT idclase_56 FROM ${TABLA} WHERE clase_56 = $1`, [clase]);
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una clase con ese nombre' });
      return;
    }

    const result = await pool.query<ClaseElementoEpp>(
      `INSERT INTO ${TABLA} (clase_56, descripcion_56, activo_56)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        clase,
        normalizeText(body.descripcion_56),
        body.activo_56 !== undefined ? body.activo_56 : true,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Clase de elemento creada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la clase de elemento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateClaseEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateClaseElementoEppDTO = req.body;

    const exists = await pool.query(`SELECT idclase_56 FROM ${TABLA} WHERE idclase_56 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Clase de elemento no encontrada' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.clase_56 !== undefined) {
      const clase = normalizeText(body.clase_56);
      if (!clase) {
        res.status(400).json({ success: false, error: 'La clase no puede estar vacía' });
        return;
      }
      const dup = await pool.query(
        `SELECT idclase_56 FROM ${TABLA} WHERE clase_56 = $1 AND idclase_56 <> $2`,
        [clase, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe una clase con ese nombre' });
        return;
      }
      updates.push(`clase_56 = $${i++}`);
      values.push(clase);
    }
    if (body.descripcion_56 !== undefined) {
      updates.push(`descripcion_56 = $${i++}`);
      values.push(normalizeText(body.descripcion_56));
    }
    if (body.activo_56 !== undefined) {
      updates.push(`activo_56 = $${i++}`);
      values.push(body.activo_56);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<ClaseElementoEpp>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idclase_56 = $${i} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Clase de elemento actualizada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la clase de elemento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteClaseEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idclase_56 = $1 RETURNING idclase_56`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Clase de elemento no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Clase de elemento eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la clase de elemento',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
