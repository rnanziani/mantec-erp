import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateMaestroEntregaRepuestoDTO,
  DetalleEntregaRepuesto,
  LineaRecepcionPendiente,
  MaestroEntregaRepuesto,
  UpdateMaestroEntregaRepuestoDTO,
} from '../types.js';

const TABLA_M = 'tbl_63_m_entrega_repuesto';
const TABLA_D = 'tbl_64_d_entrega_repuesto';
const TABLA_REC_D = 'tbl_60_d_recepcion_repuesto';

const MAESTRO_SELECT = `
  SELECT
    m.identrega_63,
    m.folio_63,
    m.idresponsable_63,
    m.idproveedor_63,
    m.fecha_entrega_63,
    m.hora_63,
    m.observacion_63,
    m.creado_en,
    m.actualizado_en,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    p.nombre_58 AS proveedor_nombre
  FROM ${TABLA_M} m
  INNER JOIN tbl_08_responsable_entrega r ON m.idresponsable_63 = r.idresponsableentrega_08
  INNER JOIN tbl_58_proveedor p ON m.idproveedor_63 = p.idproveedor_58
`;

const DETALLE_SELECT = `
  SELECT
    d.iddetalle_64,
    d.identrega_64,
    d.iddetalle_recepcion_64,
    d.idestado_reparacion_64,
    d.fecha_recepcion_64,
    d.observacion_64,
    d.creado_en,
    d.actualizado_en,
    e.codigo_61 AS estado_codigo,
    e.nombre_61 AS estado_nombre,
    rd.codigo_57 AS repuesto_codigo,
    rd.nombre_57 AS repuesto_nombre,
    dr.cantidad_60,
    mr.folio_59 AS folio_recepcion,
    m.folio_63 AS folio_entrega,
    m.fecha_entrega_63,
    m.hora_63,
    CONCAT(
      COALESCE(resp.nombreresponsableentrega_08, ''), ' ',
      COALESCE(resp.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(resp.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    prov.nombre_58 AS proveedor_nombre,
    CASE
      WHEN d.fecha_recepcion_64 IS NOT NULL
        THEN (d.fecha_recepcion_64 - m.fecha_entrega_63)
      ELSE (CURRENT_DATE - m.fecha_entrega_63)
    END AS dias_transcurridos,
    s.nombre_62 AS semaforo_nombre,
    s.color_62 AS semaforo_color
  FROM ${TABLA_D} d
  INNER JOIN ${TABLA_M} m ON d.identrega_64 = m.identrega_63
  INNER JOIN tbl_61_estado_reparacion e ON d.idestado_reparacion_64 = e.idestado_61
  INNER JOIN ${TABLA_REC_D} dr ON d.iddetalle_recepcion_64 = dr.iddetalle_60
  INNER JOIN tbl_57_repuesto_danado rd ON dr.idrepuestodanado_60 = rd.idrepuestodanado_57
  INNER JOIN tbl_59_m_recepcion_repuesto mr ON dr.idrecepcion_60 = mr.idrecepcion_59
  INNER JOIN tbl_08_responsable_entrega resp ON m.idresponsable_63 = resp.idresponsableentrega_08
  INNER JOIN tbl_58_proveedor prov ON m.idproveedor_63 = prov.idproveedor_58
  LEFT JOIN LATERAL (
    SELECT s0.nombre_62, s0.color_62
    FROM tbl_62_semaforo_entrega s0
    WHERE s0.activo_62 = true
      AND CASE
            WHEN d.fecha_recepcion_64 IS NOT NULL
              THEN (d.fecha_recepcion_64 - m.fecha_entrega_63)
            ELSE (CURRENT_DATE - m.fecha_entrega_63)
          END BETWEEN s0.dias_desde_62 AND COALESCE(s0.dias_hasta_62, 2147483647)
    ORDER BY s0.dias_desde_62 DESC
    LIMIT 1
  ) s ON true
`;

async function getDefaultEstadoId(client: { query: typeof pool.query }): Promise<number | null> {
  const r = await client.query<{ idestado_61: number }>(
    `SELECT idestado_61 FROM tbl_61_estado_reparacion
     WHERE activo_61 = true AND codigo_61 = 'EN_REPARACION'
     LIMIT 1`
  );
  return r.rows[0]?.idestado_61 ?? null;
}

async function getEstadoIdByCodigo(
  client: { query: typeof pool.query },
  codigo: string
): Promise<number | null> {
  const r = await client.query<{ idestado_61: number }>(
    `SELECT idestado_61 FROM tbl_61_estado_reparacion
     WHERE activo_61 = true AND codigo_61 = $1
     LIMIT 1`,
    [codigo]
  );
  return r.rows[0]?.idestado_61 ?? null;
}

function validarDetalles(
  detalles: CreateMaestroEntregaRepuestoDTO['detalles']
): string | null {
  if (!detalles?.length) return 'Debe agregar al menos un repuesto pendiente';
  const seen = new Set<number>();
  for (const d of detalles) {
    if (!d.iddetalle_recepcion_64) return 'Cada línea debe vincularse a un detalle de recepción';
    if (seen.has(d.iddetalle_recepcion_64)) {
      return 'No se puede repetir la misma línea de recepción';
    }
    seen.add(d.iddetalle_recepcion_64);
    if (!d.idestado_reparacion_64) return 'Cada línea debe tener un estado de reparación';
  }
  return null;
}

export const getAllEntregas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroEntregaRepuesto>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_entrega_63 DESC, m.identrega_63 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener entregas',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/** Listado plano de líneas (para grilla con semáforo) */
export const getAllLineasEntrega = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<DetalleEntregaRepuesto>(
      `${DETALLE_SELECT}
       ORDER BY m.fecha_entrega_63 DESC, d.iddetalle_64 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener líneas de entrega',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getLineasPendientesRecepcion = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<LineaRecepcionPendiente>(
      `SELECT
         dr.iddetalle_60,
         dr.idrecepcion_60,
         mr.folio_59,
         dr.idrepuestodanado_60,
         rd.codigo_57 AS repuesto_codigo,
         rd.nombre_57 AS repuesto_nombre,
         dr.cantidad_60,
         dr.estado_60,
         mr.fecha_59
       FROM ${TABLA_REC_D} dr
       INNER JOIN tbl_59_m_recepcion_repuesto mr ON dr.idrecepcion_60 = mr.idrecepcion_59
       INNER JOIN tbl_57_repuesto_danado rd ON dr.idrepuestodanado_60 = rd.idrepuestodanado_57
       WHERE dr.estado_60 = 'PENDIENTE'
         AND NOT EXISTS (
           SELECT 1 FROM ${TABLA_D} e
           WHERE e.iddetalle_recepcion_64 = dr.iddetalle_60
         )
       ORDER BY mr.fecha_59 DESC, dr.iddetalle_60 ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener líneas pendientes',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getEntregaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestro = await pool.query<MaestroEntregaRepuesto>(
      `${MAESTRO_SELECT} WHERE m.identrega_63 = $1`,
      [id]
    );
    if (maestro.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }
    const detalles = await pool.query<DetalleEntregaRepuesto>(
      `${DETALLE_SELECT} WHERE d.identrega_64 = $1 ORDER BY d.iddetalle_64 ASC`,
      [id]
    );
    res.json({
      success: true,
      data: { maestro: maestro.rows[0], detalles: detalles.rows },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la entrega',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

async function sincronizarEstadoRecepcion(
  client: { query: typeof pool.query },
  idDetalleRecepcion: number,
  fechaRecepcion: string | null | undefined
): Promise<void> {
  if (fechaRecepcion) {
    await client.query(
      `UPDATE ${TABLA_REC_D}
       SET estado_60 = 'RECIBIDO', actualizado_en = CURRENT_TIMESTAMP
       WHERE iddetalle_60 = $1 AND estado_60 <> 'ANULADO'`,
      [idDetalleRecepcion]
    );
  } else {
    await client.query(
      `UPDATE ${TABLA_REC_D}
       SET estado_60 = 'ENVIADO_PROVEEDOR', actualizado_en = CURRENT_TIMESTAMP
       WHERE iddetalle_60 = $1 AND estado_60 IN ('PENDIENTE', 'ENVIADO_PROVEEDOR')`,
      [idDetalleRecepcion]
    );
  }
}

export const createEntrega = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateMaestroEntregaRepuestoDTO = req.body;
    if (!body.idresponsable_63 || !body.idproveedor_63) {
      res.status(400).json({
        success: false,
        error: 'Responsable y proveedor son requeridos',
      });
      return;
    }
    const detalleError = validarDetalles(body.detalles);
    if (detalleError) {
      res.status(400).json({ success: false, error: detalleError });
      return;
    }

    const defaultEstado = await getDefaultEstadoId(client);
    const estadoReparado = await getEstadoIdByCodigo(client, 'REPARADO');

    await client.query('BEGIN');

    const insertM = await client.query(
      `INSERT INTO ${TABLA_M} (
        idresponsable_63, idproveedor_63, fecha_entrega_63, hora_63, observacion_63
      ) VALUES (
        $1, $2,
        COALESCE($3::date, CURRENT_DATE),
        COALESCE($4::time, CURRENT_TIME),
        $5
      ) RETURNING identrega_63`,
      [
        body.idresponsable_63,
        body.idproveedor_63,
        body.fecha_entrega_63 || null,
        body.hora_63 || null,
        body.observacion_63?.trim() || null,
      ]
    );
    const idMaestro = insertM.rows[0].identrega_63 as number;

    for (const d of body.detalles) {
      const check = await client.query<{ estado_60: string }>(
        `SELECT estado_60 FROM ${TABLA_REC_D} WHERE iddetalle_60 = $1 FOR UPDATE`,
        [d.iddetalle_recepcion_64]
      );
      if (check.rowCount === 0) {
        throw new Error(`Línea de recepción ${d.iddetalle_recepcion_64} no existe`);
      }
      if (check.rows[0].estado_60 !== 'PENDIENTE') {
        throw new Error(
          `La línea ${d.iddetalle_recepcion_64} no está PENDIENTE (estado: ${check.rows[0].estado_60})`
        );
      }

      let idEstado = d.idestado_reparacion_64 || defaultEstado;
      if (!idEstado) throw new Error('No hay estado de reparación configurado');

      const fechaRec = d.fecha_recepcion_64 || null;
      if (fechaRec && estadoReparado) {
        idEstado = estadoReparado;
      }

      await client.query(
        `INSERT INTO ${TABLA_D} (
          identrega_64, iddetalle_recepcion_64, idestado_reparacion_64,
          fecha_recepcion_64, observacion_64
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          idMaestro,
          d.iddetalle_recepcion_64,
          idEstado,
          fechaRec,
          d.observacion_64?.trim() || null,
        ]
      );

      await sincronizarEstadoRecepcion(client, d.iddetalle_recepcion_64, fechaRec);
    }

    await client.query('COMMIT');
    const maestro = await pool.query<MaestroEntregaRepuesto>(
      `${MAESTRO_SELECT} WHERE m.identrega_63 = $1`,
      [idMaestro]
    );
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Entrega creada; líneas de recepción pasaron a ENVIADO_PROVEEDOR',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear la entrega',
    });
  } finally {
    client.release();
  }
};

export const updateEntrega = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateMaestroEntregaRepuestoDTO = req.body;

    const exists = await client.query(
      `SELECT identrega_63, fecha_entrega_63 FROM ${TABLA_M} WHERE identrega_63 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    if (body.detalles !== undefined) {
      const detalleError = validarDetalles(body.detalles);
      if (detalleError) {
        res.status(400).json({ success: false, error: detalleError });
        return;
      }
    }

    const estadoReparado = await getEstadoIdByCodigo(client, 'REPARADO');
    const defaultEstado = await getDefaultEstadoId(client);

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const push = (col: string, val: unknown) => {
      updates.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (body.idresponsable_63 !== undefined) push('idresponsable_63', body.idresponsable_63);
    if (body.idproveedor_63 !== undefined) push('idproveedor_63', body.idproveedor_63);
    if (body.fecha_entrega_63 !== undefined) push('fecha_entrega_63', body.fecha_entrega_63);
    if (body.hora_63 !== undefined) push('hora_63', body.hora_63);
    if (body.observacion_63 !== undefined) {
      push('observacion_63', body.observacion_63?.trim() || null);
    }

    if (updates.length) {
      updates.push('actualizado_en = CURRENT_TIMESTAMP');
      values.push(id);
      await client.query(
        `UPDATE ${TABLA_M} SET ${updates.join(', ')} WHERE identrega_63 = $${idx}`,
        values
      );
    }

    if (body.detalles !== undefined) {
      const actuales = await client.query<{
        iddetalle_64: number;
        iddetalle_recepcion_64: number;
        fecha_recepcion_64: string | null;
      }>(
        `SELECT iddetalle_64, iddetalle_recepcion_64, fecha_recepcion_64
         FROM ${TABLA_D} WHERE identrega_64 = $1`,
        [id]
      );

      const nuevosIds = new Set(body.detalles.map((d) => d.iddetalle_recepcion_64));

      for (const old of actuales.rows) {
        if (!nuevosIds.has(old.iddetalle_recepcion_64)) {
          if (old.fecha_recepcion_64) {
            throw new Error(
              'No se puede quitar una línea ya recibida del proveedor'
            );
          }
          await client.query(`DELETE FROM ${TABLA_D} WHERE iddetalle_64 = $1`, [
            old.iddetalle_64,
          ]);
          await client.query(
            `UPDATE ${TABLA_REC_D}
             SET estado_60 = 'PENDIENTE', actualizado_en = CURRENT_TIMESTAMP
             WHERE iddetalle_60 = $1 AND estado_60 = 'ENVIADO_PROVEEDOR'`,
            [old.iddetalle_recepcion_64]
          );
        }
      }

      const mapActual = new Map(
        actuales.rows.map((r) => [r.iddetalle_recepcion_64, r])
      );

      for (const d of body.detalles) {
        const fechaRec = d.fecha_recepcion_64 || null;
        let idEstado = d.idestado_reparacion_64 || defaultEstado;
        if (!idEstado) throw new Error('No hay estado de reparación configurado');
        if (fechaRec && estadoReparado) idEstado = estadoReparado;

        const existente = mapActual.get(d.iddetalle_recepcion_64);
        if (existente) {
          await client.query(
            `UPDATE ${TABLA_D} SET
               idestado_reparacion_64 = $1,
               fecha_recepcion_64 = $2,
               observacion_64 = $3,
               actualizado_en = CURRENT_TIMESTAMP
             WHERE iddetalle_64 = $4`,
            [
              idEstado,
              fechaRec,
              d.observacion_64?.trim() || null,
              existente.iddetalle_64,
            ]
          );
          await sincronizarEstadoRecepcion(client, d.iddetalle_recepcion_64, fechaRec);
        } else {
          const check = await client.query<{ estado_60: string }>(
            `SELECT estado_60 FROM ${TABLA_REC_D} WHERE iddetalle_60 = $1 FOR UPDATE`,
            [d.iddetalle_recepcion_64]
          );
          if (check.rowCount === 0) {
            throw new Error(`Línea de recepción ${d.iddetalle_recepcion_64} no existe`);
          }
          if (check.rows[0].estado_60 !== 'PENDIENTE') {
            throw new Error(
              `La línea ${d.iddetalle_recepcion_64} no está PENDIENTE`
            );
          }
          await client.query(
            `INSERT INTO ${TABLA_D} (
              identrega_64, iddetalle_recepcion_64, idestado_reparacion_64,
              fecha_recepcion_64, observacion_64
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              id,
              d.iddetalle_recepcion_64,
              idEstado,
              fechaRec,
              d.observacion_64?.trim() || null,
            ]
          );
          await sincronizarEstadoRecepcion(client, d.iddetalle_recepcion_64, fechaRec);
        }
      }
    }

    await client.query('COMMIT');
    const maestro = await pool.query<MaestroEntregaRepuesto>(
      `${MAESTRO_SELECT} WHERE m.identrega_63 = $1`,
      [id]
    );
    res.json({
      success: true,
      data: maestro.rows[0],
      message: 'Entrega actualizada',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar la entrega',
    });
  } finally {
    client.release();
  }
};

export const deleteEntrega = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const lineas = await client.query<{
      iddetalle_recepcion_64: number;
      fecha_recepcion_64: string | null;
    }>(
      `SELECT iddetalle_recepcion_64, fecha_recepcion_64 FROM ${TABLA_D} WHERE identrega_64 = $1`,
      [id]
    );

    if (lineas.rows.some((l) => l.fecha_recepcion_64)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: hay líneas ya recibidas del proveedor',
      });
      return;
    }

    for (const l of lineas.rows) {
      await client.query(
        `UPDATE ${TABLA_REC_D}
         SET estado_60 = 'PENDIENTE', actualizado_en = CURRENT_TIMESTAMP
         WHERE iddetalle_60 = $1 AND estado_60 = 'ENVIADO_PROVEEDOR'`,
        [l.iddetalle_recepcion_64]
      );
    }

    const result = await client.query(
      `DELETE FROM ${TABLA_M} WHERE identrega_63 = $1 RETURNING identrega_63`,
      [id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Entrega eliminada; líneas volvieron a PENDIENTE',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la entrega',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};
