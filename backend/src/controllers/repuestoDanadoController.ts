import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateRepuestoDanadoDTO,
  RepuestoDanado,
  UpdateRepuestoDanadoDTO,
} from '../types.js';

const TABLA = 'tbl_57_repuesto_danado';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

export const getAllRepuestosDanados = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<RepuestoDanado>(
      `SELECT idrepuestodanado_57, codigo_57, nombre_57, descripcion_57, activo_57, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY nombre_57 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener repuestos dañados',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getRepuestoDanadoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<RepuestoDanado>(
      `SELECT * FROM ${TABLA} WHERE idrepuestodanado_57 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateRepuestoDanadoDTO = req.body;
    const nombre = normalizeText(body.nombre_57);
    const codigo = normalizeText(body.codigo_57);
    if (!nombre) {
      res.status(400).json({ success: false, error: 'El nombre es requerido' });
      return;
    }
    if (codigo) {
      const dup = await pool.query(`SELECT idrepuestodanado_57 FROM ${TABLA} WHERE codigo_57 = $1`, [codigo]);
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe un repuesto con ese código' });
        return;
      }
    }
    const result = await pool.query<RepuestoDanado>(
      `INSERT INTO ${TABLA} (codigo_57, nombre_57, descripcion_57, activo_57)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        codigo,
        nombre,
        normalizeText(body.descripcion_57),
        body.activo_57 !== undefined ? body.activo_57 : true,
      ]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Repuesto dañado creado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateRepuestoDanadoDTO = req.body;
    const exists = await pool.query(`SELECT idrepuestodanado_57 FROM ${TABLA} WHERE idrepuestodanado_57 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.nombre_57 !== undefined) {
      const nombre = normalizeText(body.nombre_57);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`nombre_57 = $${i++}`);
      values.push(nombre);
    }
    if (body.codigo_57 !== undefined) {
      const codigo = normalizeText(body.codigo_57);
      if (codigo) {
        const dup = await pool.query(
          `SELECT idrepuestodanado_57 FROM ${TABLA} WHERE codigo_57 = $1 AND idrepuestodanado_57 <> $2`,
          [codigo, id]
        );
        if ((dup.rowCount ?? 0) > 0) {
          res.status(400).json({ success: false, error: 'Ya existe un repuesto con ese código' });
          return;
        }
      }
      updates.push(`codigo_57 = $${i++}`);
      values.push(codigo);
    }
    if (body.descripcion_57 !== undefined) {
      updates.push(`descripcion_57 = $${i++}`);
      values.push(normalizeText(body.descripcion_57));
    }
    if (body.activo_57 !== undefined) {
      updates.push(`activo_57 = $${i++}`);
      values.push(body.activo_57);
    }
    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }
    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<RepuestoDanado>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idrepuestodanado_57 = $${i} RETURNING *`,
      values
    );
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Repuesto dañado actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enUso = await pool.query(
      `SELECT 1 FROM tbl_60_d_recepcion_repuesto WHERE idrepuestodanado_60 = $1 LIMIT 1`,
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE ${TABLA} SET activo_57 = false, actualizado_en = CURRENT_TIMESTAMP WHERE idrepuestodanado_57 = $1`,
        [id]
      );
      res.json({
        success: true,
        message: 'Repuesto en uso: se desactivó en lugar de eliminar',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idrepuestodanado_57 = $1 RETURNING idrepuestodanado_57`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Repuesto dañado eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
