import { Request, Response } from 'express';
import { pool } from '../db.js';

const TABLA = 'tbl_75_tipo_dano_llanta';
const SELECT = `iddano_llanta_75, codigo_75, descripcion_75, activo_75, creado_en, actualizado_en`;

export const getAllTiposDanoLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const activoOnly = req.query.activo === 'true';
    const sql = activoOnly
      ? `SELECT ${SELECT} FROM ${TABLA} WHERE activo_75 = true ORDER BY codigo_75 ASC`
      : `SELECT ${SELECT} FROM ${TABLA} ORDER BY codigo_75 ASC`;
    const result = await pool.query(sql);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de daño de llanta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getTipoDanoLlantaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT ${SELECT} FROM ${TABLA} WHERE iddano_llanta_75 = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de daño no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el tipo de daño',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createTipoDanoLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const codigo = String(req.body.codigo_75 || '').trim().toUpperCase();
    const descripcion = String(req.body.descripcion_75 || '').trim();
    const activo = req.body.activo_75 !== false;
    if (!codigo || !descripcion) {
      res.status(400).json({ success: false, error: 'Código y descripción son requeridos' });
      return;
    }
    const dup = await pool.query(`SELECT iddano_llanta_75 FROM ${TABLA} WHERE UPPER(codigo_75) = $1`, [codigo]);
    if (dup.rowCount) {
      res.status(400).json({ success: false, error: 'Ya existe un tipo de daño con ese código' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO ${TABLA} (codigo_75, descripcion_75, activo_75) VALUES ($1, $2, $3) RETURNING ${SELECT}`,
      [codigo, descripcion, activo]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Tipo de daño creado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el tipo de daño',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateTipoDanoLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const codigo = String(req.body.codigo_75 || '').trim().toUpperCase();
    const descripcion = String(req.body.descripcion_75 || '').trim();
    const activo = req.body.activo_75 !== false;
    if (!codigo || !descripcion) {
      res.status(400).json({ success: false, error: 'Código y descripción son requeridos' });
      return;
    }
    const dup = await pool.query(
      `SELECT iddano_llanta_75 FROM ${TABLA} WHERE UPPER(codigo_75) = $1 AND iddano_llanta_75 <> $2`,
      [codigo, req.params.id]
    );
    if (dup.rowCount) {
      res.status(400).json({ success: false, error: 'Ya existe otro tipo de daño con ese código' });
      return;
    }
    const result = await pool.query(
      `UPDATE ${TABLA}
       SET codigo_75 = $1, descripcion_75 = $2, activo_75 = $3, actualizado_en = CURRENT_TIMESTAMP
       WHERE iddano_llanta_75 = $4 RETURNING ${SELECT}`,
      [codigo, descripcion, activo, req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de daño no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Tipo de daño actualizado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el tipo de daño',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteTipoDanoLlanta = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE iddano_llanta_75 = $1 RETURNING iddano_llanta_75`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de daño no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Tipo de daño eliminado' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const used = /foreign key|violates/i.test(msg);
    res.status(used ? 400 : 500).json({
      success: false,
      error: used ? 'No se puede eliminar: el tipo de daño está en uso' : 'Error al eliminar',
      message: msg,
    });
  }
};
