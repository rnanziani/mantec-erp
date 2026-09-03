import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateLubricanteDTO,
  Lubricante,
  UpdateLubricanteDTO,
} from '../types.js';

const TABLA = 'tbl_70_lubricante';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

export const getAllLubricantes = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivos = String(req.query.activos || '') === '1';
    const result = await pool.query<Lubricante>(
      `SELECT *
       FROM ${TABLA}
       ${soloActivos ? 'WHERE activo_70 = true' : ''}
       ORDER BY orden_aparicion_70 ASC, descripcion_70 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener lubricantes',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getLubricanteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Lubricante>(
      `SELECT * FROM ${TABLA} WHERE idlubricante_70 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Lubricante no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el lubricante',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createLubricante = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateLubricanteDTO = req.body;
    const cob = normalizeText(body.cob_lubricante_70);
    const descripcion = normalizeText(body.descripcion_70);
    if (!cob || !descripcion) {
      res.status(400).json({ success: false, error: 'Código y descripción son requeridos' });
      return;
    }
    const orden = body.orden_aparicion_70 != null ? Number(body.orden_aparicion_70) : 100;
    const dup = await pool.query(`SELECT 1 FROM ${TABLA} WHERE cob_lubricante_70 = $1`, [cob]);
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe un lubricante con ese código' });
      return;
    }
    const result = await pool.query<Lubricante>(
      `INSERT INTO ${TABLA} (
        cob_lubricante_70, descripcion_70, orden_aparicion_70, activo_70
      ) VALUES ($1, $2, $3, $4) RETURNING *`,
      [cob, descripcion, orden, body.activo_70 !== undefined ? body.activo_70 : true]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Lubricante creado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el lubricante',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateLubricante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateLubricanteDTO = req.body;
    const exists = await pool.query(
      `SELECT idlubricante_70 FROM ${TABLA} WHERE idlubricante_70 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Lubricante no encontrado' });
      return;
    }

    const cob =
      body.cob_lubricante_70 !== undefined ? normalizeText(body.cob_lubricante_70) : undefined;
    const descripcion =
      body.descripcion_70 !== undefined ? normalizeText(body.descripcion_70) : undefined;
    if (cob !== undefined && !cob) {
      res.status(400).json({ success: false, error: 'Código no puede estar vacío' });
      return;
    }
    if (descripcion !== undefined && !descripcion) {
      res.status(400).json({ success: false, error: 'Descripción no puede estar vacía' });
      return;
    }
    if (cob) {
      const dup = await pool.query(
        `SELECT 1 FROM ${TABLA} WHERE cob_lubricante_70 = $1 AND idlubricante_70 <> $2`,
        [cob, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe un lubricante con ese código' });
        return;
      }
    }

    const result = await pool.query<Lubricante>(
      `UPDATE ${TABLA} SET
        cob_lubricante_70 = COALESCE($1, cob_lubricante_70),
        descripcion_70 = COALESCE($2, descripcion_70),
        orden_aparicion_70 = COALESCE($3, orden_aparicion_70),
        activo_70 = COALESCE($4, activo_70),
        actualizado_en = CURRENT_TIMESTAMP
       WHERE idlubricante_70 = $5
       RETURNING *`,
      [
        cob ?? null,
        descripcion ?? null,
        body.orden_aparicion_70 != null ? Number(body.orden_aparicion_70) : null,
        body.activo_70 !== undefined ? body.activo_70 : null,
        id,
      ]
    );
    res.json({ success: true, data: result.rows[0], message: 'Lubricante actualizado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el lubricante',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteLubricante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const used = await pool.query(
      `SELECT 1 FROM tbl_72_d_consumo_lubricante WHERE idlubricante_72 = $1 LIMIT 1`,
      [id]
    );
    if ((used.rowCount ?? 0) > 0) {
      const soft = await pool.query<Lubricante>(
        `UPDATE ${TABLA}
         SET activo_70 = false, actualizado_en = CURRENT_TIMESTAMP
         WHERE idlubricante_70 = $1
         RETURNING *`,
        [id]
      );
      if (soft.rowCount === 0) {
        res.status(404).json({ success: false, error: 'Lubricante no encontrado' });
        return;
      }
      res.json({
        success: true,
        data: soft.rows[0],
        message: 'Lubricante en uso: se desactivó (ya no aparece en consumos nuevos)',
      });
      return;
    }

    const result = await pool.query(`DELETE FROM ${TABLA} WHERE idlubricante_70 = $1 RETURNING idlubricante_70`, [
      id,
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Lubricante no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Lubricante eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el lubricante',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
