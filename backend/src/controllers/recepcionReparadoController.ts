import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateRecepcionRepuestoReparadoBatchDTO,
  CreateRecepcionRepuestoReparadoDTO,
  LineaEntregaParaCierre,
  RecepcionRepuestoReparado,
  UpdateRecepcionRepuestoReparadoDTO,
} from '../types.js';

const TABLA = 'tbl_65_recepcion_reparado';
const ESTADOS = new Set(['DISPONIBLE', 'INSTALADO']);

const SELECT_ALL = `
  SELECT
    r.idrecepcion_65,
    r.iddetalle_entrega_65,
    r.idresponsable_65,
    r.estado_disponible_65,
    r.idtecnico_65,
    r.idmaquina_65,
    r.fecha_65,
    r.hora_65,
    r.observacion_65,
    r.creado_en,
    r.actualizado_en,
    CONCAT(
      COALESCE(resp.nombreresponsableentrega_08, ''), ' ',
      COALESCE(resp.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(resp.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    CASE
      WHEN t.id_tecnico_21 IS NULL THEN NULL
      ELSE CONCAT(t.nombres_21, ' ', COALESCE(t.a_paterno_21, ''), ' ', COALESCE(t.a_materno_21, ''))
    END AS tecnico_nombre,
    ma.numinterno_11::text AS maquina_numinterno,
    ma.descripcion_11 AS maquina_descripcion,
    rd.codigo_57 AS repuesto_codigo,
    rd.nombre_57 AS repuesto_nombre,
    dr.cantidad_60,
    me.folio_63 AS folio_entrega,
    mr.folio_59 AS folio_recepcion_danado,
    p.nombre_58 AS proveedor_nombre
  FROM ${TABLA} r
  INNER JOIN tbl_08_responsable_entrega resp ON r.idresponsable_65 = resp.idresponsableentrega_08
  INNER JOIN tbl_64_d_entrega_repuesto de ON r.iddetalle_entrega_65 = de.iddetalle_64
  INNER JOIN tbl_63_m_entrega_repuesto me ON de.identrega_64 = me.identrega_63
  INNER JOIN tbl_58_proveedor p ON me.idproveedor_63 = p.idproveedor_58
  INNER JOIN tbl_60_d_recepcion_repuesto dr ON de.iddetalle_recepcion_64 = dr.iddetalle_60
  INNER JOIN tbl_59_m_recepcion_repuesto mr ON dr.idrecepcion_60 = mr.idrecepcion_59
  INNER JOIN tbl_57_repuesto_danado rd ON dr.idrepuestodanado_60 = rd.idrepuestodanado_57
  LEFT JOIN tbl_21_tecnico t ON r.idtecnico_65 = t.id_tecnico_21
  LEFT JOIN tbl_11_maquina ma ON r.idmaquina_65 = ma.idmaquina_11
`;

function validarEstadoYMaquina(
  estado: string,
  idMaquina: number | null | undefined
): string | null {
  if (!ESTADOS.has(estado)) {
    return 'Estado inválido. Use DISPONIBLE o INSTALADO';
  }
  if (estado === 'INSTALADO' && !idMaquina) {
    return 'Si el estado es INSTALADO debe indicar la máquina';
  }
  return null;
}

export const getAllRecepcionesReparado = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<RecepcionRepuestoReparado>(
      `${SELECT_ALL} ORDER BY COALESCE(r.fecha_65, r.creado_en::date) DESC, r.idrecepcion_65 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener recepciones de reparados',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/** Líneas de entrega etapa 2 ya recibidas del taller y aún sin cierre */
export const getLineasEntregaDisponibles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<LineaEntregaParaCierre>(
      `SELECT
         de.iddetalle_64,
         me.folio_63 AS folio_entrega,
         mr.folio_59 AS folio_recepcion,
         rd.codigo_57 AS repuesto_codigo,
         rd.nombre_57 AS repuesto_nombre,
         dr.cantidad_60,
         de.fecha_recepcion_64,
         er.nombre_61 AS estado_nombre,
         p.nombre_58 AS proveedor_nombre
       FROM tbl_64_d_entrega_repuesto de
       INNER JOIN tbl_63_m_entrega_repuesto me ON de.identrega_64 = me.identrega_63
       INNER JOIN tbl_58_proveedor p ON me.idproveedor_63 = p.idproveedor_58
       INNER JOIN tbl_61_estado_reparacion er ON de.idestado_reparacion_64 = er.idestado_61
       INNER JOIN tbl_60_d_recepcion_repuesto dr ON de.iddetalle_recepcion_64 = dr.iddetalle_60
       INNER JOIN tbl_59_m_recepcion_repuesto mr ON dr.idrecepcion_60 = mr.idrecepcion_59
       INNER JOIN tbl_57_repuesto_danado rd ON dr.idrepuestodanado_60 = rd.idrepuestodanado_57
       WHERE de.fecha_recepcion_64 IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM ${TABLA} x WHERE x.iddetalle_entrega_65 = de.iddetalle_64
         )
       ORDER BY de.fecha_recepcion_64 DESC, de.iddetalle_64 ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener líneas de entrega disponibles',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getRecepcionReparadoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<RecepcionRepuestoReparado>(
      `${SELECT_ALL} WHERE r.idrecepcion_65 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Registro no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el registro',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

async function assertLineaEntregaDisponible(
  client: { query: typeof pool.query },
  idDetalleEntrega: number,
  excludeId?: number
): Promise<void> {
  const check = await client.query<{
    iddetalle_64: number;
    fecha_recepcion_64: string | null;
  }>(
    `SELECT de.iddetalle_64, de.fecha_recepcion_64
     FROM tbl_64_d_entrega_repuesto de
     WHERE de.iddetalle_64 = $1`,
    [idDetalleEntrega]
  );
  if (check.rowCount === 0) {
    throw new Error(`Línea de entrega ${idDetalleEntrega} no existe`);
  }
  if (!check.rows[0].fecha_recepcion_64) {
    throw new Error(
      `La línea ${idDetalleEntrega} aún no tiene fecha de recepción del proveedor (etapa 2)`
    );
  }
  const used = await client.query(
    `SELECT idrecepcion_65 FROM ${TABLA}
     WHERE iddetalle_entrega_65 = $1
       AND ($2::int IS NULL OR idrecepcion_65 <> $2)
     LIMIT 1`,
    [idDetalleEntrega, excludeId ?? null]
  );
  if ((used.rowCount ?? 0) > 0) {
    throw new Error(`La línea de entrega ${idDetalleEntrega} ya fue cerrada en etapa 3`);
  }
}

export const createRecepcionReparado = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body = req.body as CreateRecepcionRepuestoReparadoDTO &
      Partial<CreateRecepcionRepuestoReparadoBatchDTO>;

    // Batch: varias líneas (p. ej. 2 calipers a la misma máquina)
    if (Array.isArray(body.lineas) && body.lineas.length > 0) {
      if (!body.idresponsable_65) {
        res.status(400).json({ success: false, error: 'Responsable es requerido' });
        return;
      }
      await client.query('BEGIN');
      const createdIds: number[] = [];
      for (const linea of body.lineas) {
        const estado = String(linea.estado_disponible_65 || 'DISPONIBLE').toUpperCase();
        const idMaquina = linea.idmaquina_65 || null;
        const err = validarEstadoYMaquina(estado, idMaquina);
        if (err) throw new Error(err);
        await assertLineaEntregaDisponible(client, linea.iddetalle_entrega_65);
        const ins = await client.query(
          `INSERT INTO ${TABLA} (
            iddetalle_entrega_65, idresponsable_65, estado_disponible_65,
            idtecnico_65, idmaquina_65, fecha_65, hora_65, observacion_65
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING idrecepcion_65`,
          [
            linea.iddetalle_entrega_65,
            body.idresponsable_65,
            estado,
            linea.idtecnico_65 || null,
            idMaquina,
            body.fecha_65 || null,
            body.hora_65 || null,
            body.observacion_65?.trim() || null,
          ]
        );
        createdIds.push(ins.rows[0].idrecepcion_65);
      }
      await client.query('COMMIT');
      const rows = await pool.query<RecepcionRepuestoReparado>(
        `${SELECT_ALL} WHERE r.idrecepcion_65 = ANY($1::int[]) ORDER BY r.idrecepcion_65`,
        [createdIds]
      );
      res.status(201).json({
        success: true,
        data: rows.rows,
        message: `${createdIds.length} registro(s) de cierre creados`,
      });
      return;
    }

    // Single
    const single = body as CreateRecepcionRepuestoReparadoDTO;
    if (!single.iddetalle_entrega_65 || !single.idresponsable_65) {
      res.status(400).json({
        success: false,
        error: 'Repuesto (línea de entrega) y responsable son requeridos',
      });
      return;
    }
    const estado = String(single.estado_disponible_65 || 'DISPONIBLE').toUpperCase();
    const idMaquina = single.idmaquina_65 || null;
    const err = validarEstadoYMaquina(estado, idMaquina);
    if (err) {
      res.status(400).json({ success: false, error: err });
      return;
    }

    await client.query('BEGIN');
    await assertLineaEntregaDisponible(client, single.iddetalle_entrega_65);
    const ins = await client.query(
      `INSERT INTO ${TABLA} (
        iddetalle_entrega_65, idresponsable_65, estado_disponible_65,
        idtecnico_65, idmaquina_65, fecha_65, hora_65, observacion_65
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING idrecepcion_65`,
      [
        single.iddetalle_entrega_65,
        single.idresponsable_65,
        estado,
        single.idtecnico_65 || null,
        idMaquina,
        single.fecha_65 || null,
        single.hora_65 || null,
        single.observacion_65?.trim() || null,
      ]
    );
    await client.query('COMMIT');
    const row = await pool.query<RecepcionRepuestoReparado>(
      `${SELECT_ALL} WHERE r.idrecepcion_65 = $1`,
      [ins.rows[0].idrecepcion_65]
    );
    res.status(201).json({
      success: true,
      data: row.rows[0],
      message: 'Cierre de reparación registrado',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el registro',
    });
  } finally {
    client.release();
  }
};

export const updateRecepcionReparado = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateRecepcionRepuestoReparadoDTO = req.body;
    const exists = await client.query(
      `SELECT idrecepcion_65, iddetalle_entrega_65, estado_disponible_65, idmaquina_65
       FROM ${TABLA} WHERE idrecepcion_65 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Registro no encontrado' });
      return;
    }
    const current = exists.rows[0];

    const estado = body.estado_disponible_65
      ? String(body.estado_disponible_65).toUpperCase()
      : String(current.estado_disponible_65);
    const idMaquina =
      body.idmaquina_65 !== undefined ? body.idmaquina_65 || null : current.idmaquina_65;
    const err = validarEstadoYMaquina(estado, idMaquina);
    if (err) {
      res.status(400).json({ success: false, error: err });
      return;
    }

    if (body.iddetalle_entrega_65 !== undefined) {
      await assertLineaEntregaDisponible(
        client,
        body.iddetalle_entrega_65,
        Number(id)
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const push = (col: string, val: unknown) => {
      updates.push(`${col} = $${i++}`);
      values.push(val);
    };

    if (body.iddetalle_entrega_65 !== undefined) push('iddetalle_entrega_65', body.iddetalle_entrega_65);
    if (body.idresponsable_65 !== undefined) push('idresponsable_65', body.idresponsable_65);
    if (body.estado_disponible_65 !== undefined) push('estado_disponible_65', estado);
    if (body.idtecnico_65 !== undefined) push('idtecnico_65', body.idtecnico_65 || null);
    if (body.idmaquina_65 !== undefined) push('idmaquina_65', idMaquina);
    if (body.fecha_65 !== undefined) push('fecha_65', body.fecha_65 || null);
    if (body.hora_65 !== undefined) push('hora_65', body.hora_65 || null);
    if (body.observacion_65 !== undefined) {
      push('observacion_65', body.observacion_65?.trim() || null);
    }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    await client.query(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idrecepcion_65 = $${i}`,
      values
    );

    const row = await pool.query<RecepcionRepuestoReparado>(
      `${SELECT_ALL} WHERE r.idrecepcion_65 = $1`,
      [id]
    );
    res.json({ success: true, data: row.rows[0], message: 'Registro actualizado' });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar',
    });
  } finally {
    client.release();
  }
};

export const deleteRecepcionReparado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idrecepcion_65 = $1 RETURNING idrecepcion_65`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Registro no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Registro eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
