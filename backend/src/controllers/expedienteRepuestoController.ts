import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateExpedienteRepuestoDTO,
  EstadoExpedienteRepuesto,
  ExpedienteRepuesto,
  HistorialExpedienteRepuesto,
  UpdateExpedienteRepuestoDTO,
} from '../types.js';

const TABLA = 'tbl_86_expediente_repuesto';
const HIST = 'tbl_87_historial_expediente_repuesto';

const ESTADOS: EstadoExpedienteRepuesto[] = [
  'MAQUINA_A_BODEGA',
  'BODEGA_A_PROVEEDOR',
  'PROVEEDOR_A_BODEGA',
  'BODEGA_A_MAQUINA',
];

const SELECT_ALL = `
  SELECT
    e.idexpediente_86,
    e.folio_86,
    e.estado_86,
    e.idmaquina_86,
    e.idtecnico_86,
    e.idresponsable_86,
    e.idrepuestodanado_86,
    e.observacion_86,
    e.fecha_recepcion_86,
    e.hora_86,
    e.idproveedor_86,
    e.fecha_entrega_proveedor_86,
    e.fecha_vuelta_86,
    e.valor_reparacion_86,
    e.fecha_instalacion_86,
    e.idtecnico_instalacion_86,
    e.idmaquina_instalacion_86,
    e.motivo_86,
    e.observacion_instalacion_86,
    e.creado_en,
    e.actualizado_en,
    ma.numinterno_11::text AS maquina_numinterno,
    ma.descripcion_11 AS maquina_descripcion,
    CONCAT(t.nombres_21, ' ', COALESCE(t.a_paterno_21, ''), ' ', COALESCE(t.a_materno_21, '')) AS tecnico_nombre,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    rd.codigo_57 AS repuesto_codigo,
    rd.nombre_57 AS repuesto_nombre,
    p.nombre_58 AS proveedor_nombre,
    CASE
      WHEN ti.id_tecnico_21 IS NULL THEN NULL
      ELSE CONCAT(ti.nombres_21, ' ', COALESCE(ti.a_paterno_21, ''), ' ', COALESCE(ti.a_materno_21, ''))
    END AS tecnico_instalacion_nombre,
    mi.numinterno_11::text AS maquina_instalacion_numinterno,
    CASE
      WHEN e.fecha_entrega_proveedor_86 IS NULL THEN NULL
      WHEN e.fecha_vuelta_86 IS NOT NULL THEN (e.fecha_vuelta_86 - e.fecha_entrega_proveedor_86)
      ELSE (CURRENT_DATE - e.fecha_entrega_proveedor_86)
    END AS dias_en_proveedor
  FROM ${TABLA} e
  INNER JOIN tbl_11_maquina ma ON e.idmaquina_86 = ma.idmaquina_11
  INNER JOIN tbl_21_tecnico t ON e.idtecnico_86 = t.id_tecnico_21
  INNER JOIN tbl_08_responsable_entrega r ON e.idresponsable_86 = r.idresponsableentrega_08
  INNER JOIN tbl_57_repuesto_danado rd ON e.idrepuestodanado_86 = rd.idrepuestodanado_57
  LEFT JOIN tbl_58_proveedor p ON e.idproveedor_86 = p.idproveedor_58
  LEFT JOIN tbl_21_tecnico ti ON e.idtecnico_instalacion_86 = ti.id_tecnico_21
  LEFT JOIN tbl_11_maquina mi ON e.idmaquina_instalacion_86 = mi.idmaquina_11
`;

function idxEstado(estado: string): number {
  return ESTADOS.indexOf(estado as EstadoExpedienteRepuesto);
}

function toDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  // node-pg entrega DATE como Date en medianoche UTC; getUTC* evita correr un día en Chile.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

function toMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

async function registrarHistorial(
  client: { query: typeof pool.query },
  id: number,
  anterior: string | null,
  nuevo: string,
  observacion?: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO ${HIST} (idexpediente_87, estado_anterior_87, estado_nuevo_87, observacion_87)
     VALUES ($1, $2, $3, $4)`,
    [id, anterior, nuevo, observacion || null]
  );
}

export const getAllExpedientes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<ExpedienteRepuesto>(
      `${SELECT_ALL} ORDER BY e.fecha_recepcion_86 DESC, e.idexpediente_86 DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al listar expedientes:', error);
    res.status(500).json({ success: false, error: 'Error al listar expedientes' });
  }
};

export const getResumenExpedientes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const porEstado = await pool.query<{ estado_86: string; n: string }>(
      `SELECT estado_86, COUNT(*)::int AS n FROM ${TABLA} GROUP BY estado_86`
    );
    const enProveedor = await pool.query(
      `${SELECT_ALL}
       WHERE e.estado_86 = 'BODEGA_A_PROVEEDOR'
       ORDER BY e.fecha_entrega_proveedor_86 ASC NULLS LAST`
    );
    res.json({
      success: true,
      data: {
        porEstado: porEstado.rows,
        enProveedor: enProveedor.rows,
      },
    });
  } catch (error) {
    console.error('Error al resumir expedientes:', error);
    res.status(500).json({ success: false, error: 'Error al resumir expedientes' });
  }
};

export const getGarantiasExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const dias = Math.max(1, Number(req.query.dias) || 180);
    const result = await pool.query(
      `SELECT
         n.idexpediente_86,
         n.folio_86,
         n.fecha_recepcion_86,
         ma.numinterno_11::text AS maquina_numinterno,
         rd.nombre_57 AS repuesto_nombre,
         ant.folio_86 AS folio_anterior,
         ant.fecha_instalacion_86 AS fecha_instalacion_anterior,
         (n.fecha_recepcion_86 - ant.fecha_instalacion_86) AS dias_vida
       FROM ${TABLA} n
       INNER JOIN tbl_11_maquina ma ON n.idmaquina_86 = ma.idmaquina_11
       INNER JOIN tbl_57_repuesto_danado rd ON n.idrepuestodanado_86 = rd.idrepuestodanado_57
       INNER JOIN LATERAL (
         SELECT a.folio_86, a.fecha_instalacion_86
         FROM ${TABLA} a
         WHERE COALESCE(a.idmaquina_instalacion_86, a.idmaquina_86) = n.idmaquina_86
           AND a.idrepuestodanado_86 = n.idrepuestodanado_86
           AND a.estado_86 = 'BODEGA_A_MAQUINA'
           AND a.fecha_instalacion_86 IS NOT NULL
           AND a.fecha_instalacion_86 < n.fecha_recepcion_86
           AND a.idexpediente_86 <> n.idexpediente_86
         ORDER BY a.fecha_instalacion_86 DESC
         LIMIT 1
       ) ant ON true
       WHERE (n.fecha_recepcion_86 - ant.fecha_instalacion_86) < $1
       ORDER BY dias_vida ASC, n.fecha_recepcion_86 DESC`,
      [dias]
    );
    res.json({ success: true, data: result.rows, umbralDias: dias });
  } catch (error) {
    console.error('Error al listar garantías:', error);
    res.status(500).json({ success: false, error: 'Error al listar candidatos a garantía' });
  }
};

export const getExpedienteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<ExpedienteRepuesto>(
      `${SELECT_ALL} WHERE e.idexpediente_86 = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Expediente no encontrado' });
      return;
    }
    const hist = await pool.query<HistorialExpedienteRepuesto>(
      `SELECT * FROM ${HIST} WHERE idexpediente_87 = $1 ORDER BY creado_en ASC, idhistorial_87 ASC`,
      [id]
    );
    res.json({ success: true, data: { expediente: result.rows[0], historial: hist.rows } });
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ success: false, error: 'Error al obtener expediente' });
  }
};

export const createExpediente = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateExpedienteRepuestoDTO = req.body;
    if (
      !body.idmaquina_86 ||
      !body.idtecnico_86 ||
      !body.idresponsable_86 ||
      !body.idrepuestodanado_86
    ) {
      res.status(400).json({
        success: false,
        error: 'Faltan máquina, técnico, responsable o tipo de repuesto',
      });
      return;
    }

    await client.query('BEGIN');
    const ins = await client.query<{ idexpediente_86: number }>(
      `INSERT INTO ${TABLA} (
         estado_86, idmaquina_86, idtecnico_86, idresponsable_86, idrepuestodanado_86,
         observacion_86, fecha_recepcion_86, hora_86
       ) VALUES ('MAQUINA_A_BODEGA', $1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), COALESCE($7::time, CURRENT_TIME))
       RETURNING idexpediente_86`,
      [
        body.idmaquina_86,
        body.idtecnico_86,
        body.idresponsable_86,
        body.idrepuestodanado_86,
        body.observacion_86?.trim() || null,
        toDate(body.fecha_recepcion_86),
        body.hora_86 || null,
      ]
    );
    const id = ins.rows[0].idexpediente_86;
    await registrarHistorial(client, id, null, 'MAQUINA_A_BODEGA', 'Alta en bodega');
    await client.query('COMMIT');

    const created = await pool.query<ExpedienteRepuesto>(
      `${SELECT_ALL} WHERE e.idexpediente_86 = $1`,
      [id]
    );
    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear expediente:', error);
    res.status(500).json({ success: false, error: 'Error al crear expediente' });
  } finally {
    client.release();
  }
};

export const updateExpediente = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const body: UpdateExpedienteRepuestoDTO = req.body;

    await client.query('BEGIN');
    const actual = await client.query<ExpedienteRepuesto>(
      `SELECT * FROM ${TABLA} WHERE idexpediente_86 = $1 FOR UPDATE`,
      [id]
    );
    if (actual.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Expediente no encontrado' });
      return;
    }
    const row = actual.rows[0];
    const actualIdx = idxEstado(row.estado_86);
    const nuevoEstado = (body.estado_86 || row.estado_86) as EstadoExpedienteRepuesto;
    const nuevoIdx = idxEstado(nuevoEstado);

    if (nuevoIdx < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Estado inválido' });
      return;
    }
    if (nuevoIdx < actualIdx) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'El ciclo no retrocede. Cree otro expediente si es un daño nuevo.' });
      return;
    }
    if (nuevoIdx > actualIdx + 1) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Avance un estado a la vez (no salte pasos).' });
      return;
    }

    const enOrigen = row.estado_86 === 'MAQUINA_A_BODEGA';

    const idproveedor = row.idproveedor_86
      || (body.idproveedor_86 !== undefined ? body.idproveedor_86 : null);
    const fechaEntrega = toDate(row.fecha_entrega_proveedor_86)
      || toDate(body.fecha_entrega_proveedor_86);
    const fechaVuelta = toDate(row.fecha_vuelta_86) || toDate(body.fecha_vuelta_86);
    const fechaInst = toDate(row.fecha_instalacion_86) || toDate(body.fecha_instalacion_86);
    const idTecInst = row.idtecnico_instalacion_86
      || (body.idtecnico_instalacion_86 !== undefined ? body.idtecnico_instalacion_86 : null);
    const idMaqInst = row.idmaquina_instalacion_86
      || body.idmaquina_instalacion_86
      || row.idmaquina_86;
    const cerrado = row.estado_86 === 'BODEGA_A_MAQUINA';
    const valorReparacion = cerrado
      ? Number(row.valor_reparacion_86 ?? 0)
      : body.valor_reparacion_86 !== undefined
        ? toMoney(body.valor_reparacion_86)
        : row.valor_reparacion_86 != null
          ? Number(row.valor_reparacion_86)
          : null;

    if (nuevoIdx >= 1 && (!idproveedor || !fechaEntrega)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Bodega → Proveedor requiere proveedor y fecha de entrega',
      });
      return;
    }
    if (nuevoIdx >= 2 && !fechaVuelta) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Proveedor → Bodega requiere fecha de vuelta',
      });
      return;
    }
    if (nuevoIdx >= 2 && valorReparacion == null) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Proveedor → Bodega requiere valor de reparación (0 si es garantía o no cobró)',
      });
      return;
    }
    if (nuevoIdx >= 2 && fechaEntrega && fechaVuelta && fechaVuelta < fechaEntrega) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'La fecha de vuelta no puede ser anterior a la entrega' });
      return;
    }
    if (nuevoIdx >= 3 && (!fechaInst || !idTecInst || !idMaqInst)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Bodega → Máquina requiere fecha, técnico y máquina de instalación',
      });
      return;
    }

    await client.query(
      `UPDATE ${TABLA} SET
         estado_86 = $2,
         idmaquina_86 = $3,
         idtecnico_86 = $4,
         idresponsable_86 = $5,
         idrepuestodanado_86 = $6,
         observacion_86 = $7,
         fecha_recepcion_86 = $8,
         hora_86 = $9,
         idproveedor_86 = $10,
         fecha_entrega_proveedor_86 = $11,
         fecha_vuelta_86 = $12,
         valor_reparacion_86 = $13,
         fecha_instalacion_86 = $14,
         idtecnico_instalacion_86 = $15,
         idmaquina_instalacion_86 = $16,
         motivo_86 = $17,
         observacion_instalacion_86 = $18
       WHERE idexpediente_86 = $1`,
      [
        id,
        nuevoEstado,
        enOrigen && body.idmaquina_86 ? body.idmaquina_86 : row.idmaquina_86,
        enOrigen && body.idtecnico_86 ? body.idtecnico_86 : row.idtecnico_86,
        enOrigen && body.idresponsable_86 ? body.idresponsable_86 : row.idresponsable_86,
        enOrigen && body.idrepuestodanado_86 ? body.idrepuestodanado_86 : row.idrepuestodanado_86,
        body.observacion_86 !== undefined ? body.observacion_86?.trim() || null : row.observacion_86,
        enOrigen && body.fecha_recepcion_86
          ? toDate(body.fecha_recepcion_86)
          : toDate(row.fecha_recepcion_86),
        enOrigen && body.hora_86 ? body.hora_86 : row.hora_86,
        idproveedor || null,
        fechaEntrega,
        fechaVuelta,
        valorReparacion,
        fechaInst,
        idTecInst || null,
        idMaqInst || null,
        body.motivo_86 !== undefined ? body.motivo_86?.trim() || null : row.motivo_86,
        body.observacion_instalacion_86 !== undefined
          ? body.observacion_instalacion_86?.trim() || null
          : row.observacion_instalacion_86,
      ]
    );

    if (nuevoEstado !== row.estado_86) {
      await registrarHistorial(client, Number(id), row.estado_86, nuevoEstado, 'Avance de estado');
    }

    await client.query('COMMIT');
    const updated = await pool.query<ExpedienteRepuesto>(
      `${SELECT_ALL} WHERE e.idexpediente_86 = $1`,
      [id]
    );
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar expediente:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar expediente' });
  } finally {
    client.release();
  }
};

export const deleteExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const actual = await pool.query<{ estado_86: string }>(
      `SELECT estado_86 FROM ${TABLA} WHERE idexpediente_86 = $1`,
      [id]
    );
    if (actual.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Expediente no encontrado' });
      return;
    }
    if (actual.rows[0].estado_86 !== 'MAQUINA_A_BODEGA') {
      res.status(400).json({
        success: false,
        error: 'Solo se elimina un expediente que aún no salió a proveedor',
      });
      return;
    }
    await pool.query(`DELETE FROM ${TABLA} WHERE idexpediente_86 = $1`, [id]);
    res.json({ success: true, message: 'Expediente eliminado' });
  } catch (error) {
    console.error('Error al eliminar expediente:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar expediente' });
  }
};
