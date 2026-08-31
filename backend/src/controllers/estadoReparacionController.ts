import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateEstadoReparacionDTO,
  EstadoReparacion,
  UpdateEstadoReparacionDTO,
} from '../types.js';

const TABLA = 'tbl_61_estado_reparacion';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

function normalizeNombre(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

export const getAllEstadosReparacion = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<EstadoReparacion>(
      `SELECT idestado_61, codigo_61, nombre_61, activo_61, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY nombre_61 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estados de reparación',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getEstadoReparacionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<EstadoReparacion>(
      `SELECT * FROM ${TABLA} WHERE idestado_61 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Estado no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el estado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createEstadoReparacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateEstadoReparacionDTO = req.body;
    const codigo = normalizeText(body.codigo_61);
    const nombre = normalizeNombre(body.nombre_61);
    if (!codigo || !nombre) {
      res.status(400).json({ success: false, error: 'Código y nombre son requeridos' });
      return;
    }
    const dup = await pool.query(`SELECT idestado_61 FROM ${TABLA} WHERE codigo_61 = $1`, [codigo]);
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe un estado con ese código' });
      return;
    }
    const result = await pool.query<EstadoReparacion>(
      `INSERT INTO ${TABLA} (codigo_61, nombre_61, activo_61)
       VALUES ($1, $2, $3) RETURNING *`,
      [codigo, nombre, body.activo_61 !== undefined ? body.activo_61 : true]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Estado de reparación creado',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el estado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateEstadoReparacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateEstadoReparacionDTO = req.body;
    const exists = await pool.query(`SELECT idestado_61 FROM ${TABLA} WHERE idestado_61 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Estado no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.codigo_61 !== undefined) {
      const codigo = normalizeText(body.codigo_61);
      if (!codigo) {
        res.status(400).json({ success: false, error: 'El código no puede estar vacío' });
        return;
      }
      const dup = await pool.query(
        `SELECT idestado_61 FROM ${TABLA} WHERE codigo_61 = $1 AND idestado_61 <> $2`,
        [codigo, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe un estado con ese código' });
        return;
      }
      updates.push(`codigo_61 = $${i++}`);
      values.push(codigo);
    }
    if (body.nombre_61 !== undefined) {
      const nombre = normalizeNombre(body.nombre_61);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`nombre_61 = $${i++}`);
      values.push(nombre);
    }
    if (body.activo_61 !== undefined) {
      updates.push(`activo_61 = $${i++}`);
      values.push(body.activo_61);
    }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<EstadoReparacion>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idestado_61 = $${i} RETURNING *`,
      values
    );
    res.json({ success: true, data: result.rows[0], message: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el estado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteEstadoReparacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enUso = await pool.query(
      `SELECT 1 FROM tbl_64_d_entrega_repuesto WHERE idestado_reparacion_64 = $1 LIMIT 1`,
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE ${TABLA} SET activo_61 = false, actualizado_en = CURRENT_TIMESTAMP WHERE idestado_61 = $1`,
        [id]
      );
      res.json({
        success: true,
        message: 'Estado en uso: se desactivó (soft-delete)',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idestado_61 = $1 RETURNING idestado_61`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Estado no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Estado eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el estado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
