import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateSemaforoEntregaDTO,
  SemaforoEntrega,
  UpdateSemaforoEntregaDTO,
} from '../types.js';

const TABLA = 'tbl_62_semaforo_entrega';

function normalizeNombre(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

function normalizeColor(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

export const getAllSemaforos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<SemaforoEntrega>(
      `SELECT idsemaforo_62, nombre_62, dias_desde_62, dias_hasta_62, color_62, activo_62, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY dias_desde_62 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener semáforos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getSemaforoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<SemaforoEntrega>(
      `SELECT * FROM ${TABLA} WHERE idsemaforo_62 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Semáforo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el semáforo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createSemaforo = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateSemaforoEntregaDTO = req.body;
    const nombre = normalizeNombre(body.nombre_62);
    const color = normalizeColor(body.color_62);
    const desde = Number(body.dias_desde_62);
    const hasta =
      body.dias_hasta_62 === null || body.dias_hasta_62 === undefined || body.dias_hasta_62 === ('' as unknown)
        ? null
        : Number(body.dias_hasta_62);

    if (!nombre || !color) {
      res.status(400).json({ success: false, error: 'Nombre y color son requeridos' });
      return;
    }
    if (Number.isNaN(desde) || desde < 0) {
      res.status(400).json({ success: false, error: 'días desde debe ser un entero >= 0' });
      return;
    }
    if (hasta !== null && (Number.isNaN(hasta) || hasta < desde)) {
      res.status(400).json({ success: false, error: 'días hasta debe ser >= días desde (o vacío = infinito)' });
      return;
    }

    const result = await pool.query<SemaforoEntrega>(
      `INSERT INTO ${TABLA} (nombre_62, dias_desde_62, dias_hasta_62, color_62, activo_62)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, desde, hasta, color, body.activo_62 !== undefined ? body.activo_62 : true]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Semáforo creado',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el semáforo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateSemaforo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateSemaforoEntregaDTO = req.body;
    const exists = await pool.query<SemaforoEntrega>(
      `SELECT * FROM ${TABLA} WHERE idsemaforo_62 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Semáforo no encontrado' });
      return;
    }
    const base = exists.rows[0];

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.nombre_62 !== undefined) {
      const nombre = normalizeNombre(body.nombre_62);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`nombre_62 = $${i++}`);
      values.push(nombre);
    }
    if (body.dias_desde_62 !== undefined) {
      const desde = Number(body.dias_desde_62);
      if (Number.isNaN(desde) || desde < 0) {
        res.status(400).json({ success: false, error: 'días desde inválido' });
        return;
      }
      updates.push(`dias_desde_62 = $${i++}`);
      values.push(desde);
    }
    if (body.dias_hasta_62 !== undefined) {
      const hasta =
        body.dias_hasta_62 === null || body.dias_hasta_62 === ('' as unknown)
          ? null
          : Number(body.dias_hasta_62);
      if (hasta !== null && Number.isNaN(hasta)) {
        res.status(400).json({ success: false, error: 'días hasta inválido' });
        return;
      }
      updates.push(`dias_hasta_62 = $${i++}`);
      values.push(hasta);
    }
    if (body.color_62 !== undefined) {
      const color = normalizeColor(body.color_62);
      if (!color) {
        res.status(400).json({ success: false, error: 'El color no puede estar vacío' });
        return;
      }
      updates.push(`color_62 = $${i++}`);
      values.push(color);
    }
    if (body.activo_62 !== undefined) {
      updates.push(`activo_62 = $${i++}`);
      values.push(body.activo_62);
    }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    const nextDesde =
      body.dias_desde_62 !== undefined ? Number(body.dias_desde_62) : Number(base.dias_desde_62);
    const nextHasta =
      body.dias_hasta_62 !== undefined
        ? body.dias_hasta_62 === null || body.dias_hasta_62 === ('' as unknown)
          ? null
          : Number(body.dias_hasta_62)
        : base.dias_hasta_62 == null
          ? null
          : Number(base.dias_hasta_62);
    if (nextHasta !== null && nextHasta < nextDesde) {
      res.status(400).json({
        success: false,
        error: 'días hasta debe ser >= días desde',
      });
      return;
    }

    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<SemaforoEntrega>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idsemaforo_62 = $${i} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0], message: 'Semáforo actualizado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el semáforo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteSemaforo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idsemaforo_62 = $1 RETURNING idsemaforo_62`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Semáforo no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Semáforo eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el semáforo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
