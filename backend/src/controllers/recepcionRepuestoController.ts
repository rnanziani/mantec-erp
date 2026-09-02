import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateMaestroRecepcionRepuestoDTO,
  DetalleRecepcionRepuesto,
  MaestroRecepcionRepuesto,
  UpdateMaestroRecepcionRepuestoDTO,
} from '../types.js';

const TABLA_M = 'tbl_59_m_recepcion_repuesto';
const TABLA_D = 'tbl_60_d_recepcion_repuesto';
const ESTADOS = new Set(['PENDIENTE', 'ENVIADO_PROVEEDOR', 'RECIBIDO', 'ANULADO']);

const MAESTRO_SELECT = `
  SELECT
    m.idrecepcion_59,
    m.folio_59,
    m.idmaquina_59,
    m.idtecnico_59,
    m.idresponsable_59,
    m.idproveedor_59,
    m.fecha_59,
    m.hora_59,
    m.observacion_59,
    m.creado_en,
    m.actualizado_en,
    COALESCE(ma.descripcion_11, '') AS maquina_descripcion,
    COALESCE(ma.numinterno_11::text, '') AS maquina_numinterno,
    CONCAT(t.nombres_21, ' ', COALESCE(t.a_paterno_21, ''), ' ', COALESCE(t.a_materno_21, '')) AS tecnico_nombre,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    p.nombre_58 AS proveedor_nombre,
    (
      SELECT string_agg(
        TRIM(
          CONCAT(
            COALESCE(rd.codigo_57, ''),
            CASE WHEN rd.codigo_57 IS NOT NULL AND rd.codigo_57 <> '' THEN ' ' ELSE '' END,
            COALESCE(rd.nombre_57, ''),
            ' (x', d.cantidad_60::text, ')'
          )
        ),
        ' | ' ORDER BY d.iddetalle_60
      )
      FROM ${TABLA_D} d
      INNER JOIN tbl_57_repuesto_danado rd ON d.idrepuestodanado_60 = rd.idrepuestodanado_57
      WHERE d.idrecepcion_60 = m.idrecepcion_59
    ) AS repuestos_resumen
  FROM ${TABLA_M} m
  INNER JOIN tbl_11_maquina ma ON m.idmaquina_59 = ma.idmaquina_11
  INNER JOIN tbl_21_tecnico t ON m.idtecnico_59 = t.id_tecnico_21
  INNER JOIN tbl_08_responsable_entrega r ON m.idresponsable_59 = r.idresponsableentrega_08
  INNER JOIN tbl_58_proveedor p ON m.idproveedor_59 = p.idproveedor_58
`;

const DETALLE_SELECT = `
  SELECT
    d.iddetalle_60,
    d.idrecepcion_60,
    d.idrepuestodanado_60,
    d.cantidad_60,
    d.estado_60,
    d.observacion_60,
    d.creado_en,
    d.actualizado_en,
    rd.codigo_57 AS repuesto_codigo,
    rd.nombre_57 AS repuesto_nombre
  FROM ${TABLA_D} d
  INNER JOIN tbl_57_repuesto_danado rd ON d.idrepuestodanado_60 = rd.idrepuestodanado_57
`;

function validarDetalles(
  detalles: CreateMaestroRecepcionRepuestoDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un repuesto en el detalle';
  const seen = new Set<number>();
  for (const d of detalles) {
    if (!d.idrepuestodanado_60) return 'Cada línea debe tener un repuesto dañado';
    if (seen.has(d.idrepuestodanado_60)) {
      return 'No se puede repetir el mismo repuesto en el detalle';
    }
    seen.add(d.idrepuestodanado_60);
    if (!d.cantidad_60 || d.cantidad_60 < 1) return 'La cantidad debe ser mayor a 0';
    const estado = String(d.estado_60 || 'PENDIENTE').toUpperCase();
    if (!ESTADOS.has(estado)) {
      return `Estado inválido: ${estado}. Use PENDIENTE, ENVIADO_PROVEEDOR, RECIBIDO o ANULADO`;
    }
  }
  return null;
}

export const getAllRecepciones = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroRecepcionRepuesto>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_59 DESC, m.idrecepcion_59 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener recepciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getRecepcionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestro = await pool.query<MaestroRecepcionRepuesto>(
      `${MAESTRO_SELECT} WHERE m.idrecepcion_59 = $1`,
      [id]
    );
    if (maestro.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Recepción no encontrada' });
      return;
    }
    const detalles = await pool.query<DetalleRecepcionRepuesto>(
      `${DETALLE_SELECT} WHERE d.idrecepcion_60 = $1 ORDER BY d.iddetalle_60 ASC`,
      [id]
    );
    res.json({
      success: true,
      data: { maestro: maestro.rows[0], detalles: detalles.rows },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la recepción',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getDetallesRecepcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<DetalleRecepcionRepuesto>(
      `${DETALLE_SELECT} WHERE d.idrecepcion_60 = $1 ORDER BY d.iddetalle_60 ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalles',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createRecepcion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroRecepcionRepuestoDTO = req.body;
    if (!body.idmaquina_59 || !body.idtecnico_59 || !body.idresponsable_59 || !body.idproveedor_59) {
      res.status(400).json({
        success: false,
        error: 'Máquina, técnico, responsable y proveedor son requeridos',
      });
      return;
    }
    const detalleError = validarDetalles(body.detalles);
    if (detalleError) {
      res.status(400).json({ success: false, error: detalleError });
      return;
    }

    await client.query('BEGIN');
    const insertM = await client.query(
      `INSERT INTO ${TABLA_M} (
        idmaquina_59, idtecnico_59, idresponsable_59, idproveedor_59,
        fecha_59, hora_59, observacion_59
      ) VALUES (
        $1, $2, $3, $4,
        COALESCE($5::date, CURRENT_DATE),
        COALESCE($6::time, CURRENT_TIME),
        $7
      ) RETURNING idrecepcion_59`,
      [
        body.idmaquina_59,
        body.idtecnico_59,
        body.idresponsable_59,
        body.idproveedor_59,
        body.fecha_59 || null,
        body.hora_59 || null,
        body.observacion_59?.trim() || null,
      ]
    );
    const idMaestro = insertM.rows[0].idrecepcion_59;

    for (const d of body.detalles) {
      await client.query(
        `INSERT INTO ${TABLA_D} (
          idrecepcion_60, idrepuestodanado_60, cantidad_60, estado_60, observacion_60
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          idMaestro,
          d.idrepuestodanado_60,
          d.cantidad_60,
          String(d.estado_60 || 'PENDIENTE').toUpperCase(),
          d.observacion_60?.trim() || null,
        ]
      );
    }

    await client.query('COMMIT');
    const maestro = await pool.query<MaestroRecepcionRepuesto>(
      `${MAESTRO_SELECT} WHERE m.idrecepcion_59 = $1`,
      [idMaestro]
    );
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Recepción creada exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear la recepción',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const updateRecepcion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroRecepcionRepuestoDTO = req.body;

    const exists = await client.query(
      `SELECT idrecepcion_59 FROM ${TABLA_M} WHERE idrecepcion_59 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Recepción no encontrada' });
      return;
    }

    if (body.detalles !== undefined) {
      const detalleError = validarDetalles(body.detalles);
      if (detalleError) {
        res.status(400).json({ success: false, error: detalleError });
        return;
      }
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const push = (col: string, val: unknown) => {
      updates.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (body.idmaquina_59 !== undefined) push('idmaquina_59', body.idmaquina_59);
    if (body.idtecnico_59 !== undefined) push('idtecnico_59', body.idtecnico_59);
    if (body.idresponsable_59 !== undefined) push('idresponsable_59', body.idresponsable_59);
    if (body.idproveedor_59 !== undefined) push('idproveedor_59', body.idproveedor_59);
    if (body.fecha_59 !== undefined) push('fecha_59', body.fecha_59);
    if (body.hora_59 !== undefined) push('hora_59', body.hora_59);
    if (body.observacion_59 !== undefined) push('observacion_59', body.observacion_59?.trim() || null);

    if (updates.length) {
      updates.push('actualizado_en = CURRENT_TIMESTAMP');
      values.push(id);
      await client.query(
        `UPDATE ${TABLA_M} SET ${updates.join(', ')} WHERE idrecepcion_59 = $${idx}`,
        values
      );
    }

    if (body.detalles !== undefined) {
      await client.query(`DELETE FROM ${TABLA_D} WHERE idrecepcion_60 = $1`, [id]);
      for (const d of body.detalles) {
        await client.query(
          `INSERT INTO ${TABLA_D} (
            idrecepcion_60, idrepuestodanado_60, cantidad_60, estado_60, observacion_60
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            d.idrepuestodanado_60,
            d.cantidad_60,
            String(d.estado_60 || 'PENDIENTE').toUpperCase(),
            d.observacion_60?.trim() || null,
          ]
        );
      }
    }

    await client.query('COMMIT');
    const maestro = await pool.query<MaestroRecepcionRepuesto>(
      `${MAESTRO_SELECT} WHERE m.idrecepcion_59 = $1`,
      [id]
    );
    res.json({
      success: true,
      data: maestro.rows[0],
      message: 'Recepción actualizada exitosamente',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la recepción',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deleteRecepcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA_M} WHERE idrecepcion_59 = $1 RETURNING idrecepcion_59`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Recepción no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Recepción eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la recepción',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
