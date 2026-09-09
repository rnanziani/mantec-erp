import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateUnidadRepuestoDTO,
  UnidadRepuesto,
  UpdateUnidadRepuestoDTO,
} from '../types.js';

const SELECT_UNIDAD = `
  SELECT
    u.idunidad_81,
    u.codigo_81,
    u.idrepuesto_81,
    u.observacion_81,
    u.activo_81,
    u.creado_en,
    u.actualizado_en,
    t.codigo_57 AS codigo_tipo_57,
    t.nombre_57 AS nombre_tipo_57,
    ub.descripcion_82 AS ubicacion_actual,
    CASE
      WHEN ub.codigo_82 = 'MAQUINA' THEN CONCAT(maq.numinterno_11, ' (', COALESCE(maq.ppu_11, ''), ')')
      ELSE NULL
    END AS maquina_actual,
    CASE
      WHEN ub.codigo_82 = 'PROVEEDOR' THEN pr.nombre_58
      ELSE NULL
    END AS proveedor_actual
  FROM tbl_81_unidad_repuesto u
  INNER JOIN tbl_57_repuesto_danado t ON t.idrepuestodanado_57 = u.idrepuesto_81
  LEFT JOIN LATERAL (
    SELECT e.idubicacion_85, e.idmaquina_85, e.idproveedor_85
    FROM tbl_85_existencia_repuesto e
    WHERE e.idunidad_85 = u.idunidad_81 AND e.cantidad_85 >= 1
    ORDER BY e.actualizado_en DESC
    LIMIT 1
  ) ex ON true
  LEFT JOIN tbl_82_ubicacion_repuesto ub ON ub.idubicacion_82 = ex.idubicacion_85
  LEFT JOIN tbl_11_maquina maq ON maq.idmaquina_11 = ex.idmaquina_85
  LEFT JOIN tbl_58_proveedor pr ON pr.idproveedor_58 = ex.idproveedor_85
`;

function normalizarObservacion(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  return t ? t.slice(0, 250) : null;
}

export const getAllUnidadesRepuesto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<UnidadRepuesto>(
      `${SELECT_UNIDAD} ORDER BY u.idunidad_81 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener unidades',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getUnidadRepuestoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<UnidadRepuesto>(
      `${SELECT_UNIDAD} WHERE u.idunidad_81 = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Unidad no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la unidad',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createUnidadRepuesto = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateUnidadRepuestoDTO = req.body;
    if (!body.idrepuesto_81) {
      res.status(400).json({ success: false, error: 'El tipo de repuesto es requerido' });
      return;
    }
    const tipo = await pool.query(
      `SELECT idrepuestodanado_57 FROM tbl_57_repuesto_danado
       WHERE idrepuestodanado_57 = $1 AND activo_57 = true`,
      [body.idrepuesto_81]
    );
    if (tipo.rowCount === 0) {
      res.status(400).json({ success: false, error: 'El tipo de repuesto no existe o está inactivo' });
      return;
    }
    const inserted = await pool.query<{ idunidad_81: number }>(
      `INSERT INTO tbl_81_unidad_repuesto (idrepuesto_81, observacion_81, activo_81)
       VALUES ($1, $2, $3)
       RETURNING idunidad_81`,
      [body.idrepuesto_81, normalizarObservacion(body.observacion_81), body.activo_81 !== false]
    );
    const created = await pool.query<UnidadRepuesto>(
      `${SELECT_UNIDAD} WHERE u.idunidad_81 = $1`,
      [inserted.rows[0].idunidad_81]
    );
    res.status(201).json({
      success: true,
      data: created.rows[0],
      message: `Unidad ${created.rows[0].codigo_81} creada. Registre el movimiento Máquina → Bodega.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la unidad',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateUnidadRepuesto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateUnidadRepuestoDTO = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];
    let n = 1;
    if (body.idrepuesto_81 !== undefined) {
      updates.push(`idrepuesto_81 = $${n++}`);
      values.push(body.idrepuesto_81);
    }
    if (body.observacion_81 !== undefined) {
      updates.push(`observacion_81 = $${n++}`);
      values.push(normalizarObservacion(body.observacion_81));
    }
    if (body.activo_81 !== undefined) {
      updates.push(`activo_81 = $${n++}`);
      values.push(body.activo_81);
    }
    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }
    updates.push('actualizado_en = NOW()');
    values.push(id);
    const result = await pool.query(
      `UPDATE tbl_81_unidad_repuesto SET ${updates.join(', ')}
       WHERE idunidad_81 = $${n}
       RETURNING idunidad_81`,
      values
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Unidad no encontrada' });
      return;
    }
    const updated = await pool.query<UnidadRepuesto>(
      `${SELECT_UNIDAD} WHERE u.idunidad_81 = $1`,
      [id]
    );
    res.json({ success: true, data: updated.rows[0], message: 'Unidad actualizada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la unidad',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteUnidadRepuesto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const movs = await pool.query(
      `SELECT 1 FROM tbl_84_movimiento_repuesto WHERE idunidad_84 = $1 LIMIT 1`,
      [id]
    );
    if ((movs.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: la unidad ya tiene movimientos',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM tbl_81_unidad_repuesto WHERE idunidad_81 = $1 RETURNING idunidad_81`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Unidad no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Unidad eliminada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la unidad',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
