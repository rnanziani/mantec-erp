import { Request, Response } from 'express';
import { pool } from '../db.js';

const TABLA = 'tbl_73_posicion_neumatico';
const SELECT = `idposicion_73, codigo_73, descripcion_73, numero_73, orden_73, activo_73, creado_en, actualizado_en`;

export const getAllPosicionesNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const activoOnly = req.query.activo === 'true';
    const sql = activoOnly
      ? `SELECT ${SELECT} FROM ${TABLA} WHERE activo_73 = true ORDER BY COALESCE(numero_73, orden_73) ASC, codigo_73 ASC`
      : `SELECT ${SELECT} FROM ${TABLA} ORDER BY COALESCE(numero_73, orden_73) ASC, codigo_73 ASC`;
    const result = await pool.query(sql);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las posiciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getPosicionNeumaticoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ${SELECT} FROM ${TABLA} WHERE idposicion_73 = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Posición no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la posición',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createPosicionNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const codigo = String(req.body.codigo_73 || '').trim().toUpperCase();
    const descripcion = String(req.body.descripcion_73 || '').trim();
    const numero = req.body.numero_73 != null && req.body.numero_73 !== '' ? Number(req.body.numero_73) : null;
    const orden = req.body.orden_73 != null ? Number(req.body.orden_73) : numero ?? 100;
    const activo = req.body.activo_73 !== false;
    if (!codigo || !descripcion) {
      res.status(400).json({ success: false, error: 'Código y descripción son requeridos' });
      return;
    }
    const dup = await pool.query(`SELECT idposicion_73 FROM ${TABLA} WHERE UPPER(codigo_73) = $1`, [codigo]);
    if (dup.rowCount) {
      res.status(400).json({ success: false, error: 'Ya existe una posición con ese código' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO ${TABLA} (codigo_73, descripcion_73, numero_73, orden_73, activo_73)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${SELECT}`,
      [codigo, descripcion, numero, orden, activo]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Posición creada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la posición',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updatePosicionNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const codigo = String(req.body.codigo_73 || '').trim().toUpperCase();
    const descripcion = String(req.body.descripcion_73 || '').trim();
    const numero = req.body.numero_73 != null && req.body.numero_73 !== '' ? Number(req.body.numero_73) : null;
    const orden = req.body.orden_73 != null ? Number(req.body.orden_73) : numero ?? 100;
    const activo = req.body.activo_73 !== false;
    if (!codigo || !descripcion) {
      res.status(400).json({ success: false, error: 'Código y descripción son requeridos' });
      return;
    }
    const dup = await pool.query(
      `SELECT idposicion_73 FROM ${TABLA} WHERE UPPER(codigo_73) = $1 AND idposicion_73 <> $2`,
      [codigo, req.params.id]
    );
    if (dup.rowCount) {
      res.status(400).json({ success: false, error: 'Ya existe otra posición con ese código' });
      return;
    }
    const result = await pool.query(
      `UPDATE ${TABLA}
       SET codigo_73 = $1, descripcion_73 = $2, numero_73 = $3, orden_73 = $4, activo_73 = $5,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE idposicion_73 = $6 RETURNING ${SELECT}`,
      [codigo, descripcion, numero, orden, activo, req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Posición no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Posición actualizada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la posición',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deletePosicionNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idposicion_73 = $1 RETURNING idposicion_73`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Posición no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Posición eliminada' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const used = /foreign key|violates/i.test(msg);
    res.status(used ? 400 : 500).json({
      success: false,
      error: used ? 'No se puede eliminar: la posición está en uso' : 'Error al eliminar la posición',
      message: msg,
    });
  }
};
