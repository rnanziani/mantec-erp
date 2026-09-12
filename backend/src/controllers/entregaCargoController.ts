import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PdfPrinter from 'pdfmake';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';
import { pool } from '../db.js';
import {
  CreateDevolucionCargoDTO,
  CreateEntregaCargoDTO,
  DetalleEntregaCargo,
  InventarioCargoVigente,
  MaestroEntregaCargo,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CODIGO_DOC = 'SIG F-622-008';
const VERSION_DOC = '001';
const EMPRESA_LEGAL = {
  nombre: 'Transporte Transantin',
  rut: '77.189.090-3',
};
const ENCARGADO_BODEGA = {
  nombre: 'Ricardo Nuñez Anziani',
  rut: '10.050.993-8',
};
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const COMPROMISOS_ACTA = [
  'Utilizar las herramientas exclusivamente para fines laborales.',
  'Mantenerlas en buen estado de conservación y funcionamiento.',
  'Informar oportunamente cualquier daño, pérdida o desperfecto.',
  'Restituir las herramientas a la empresa cuando ésta lo requiera o al término de la relación laboral, en las mismas condiciones de uso normal en que fueron entregadas.',
];

const TABLA_M = 'tbl_67_m_entrega_cargo';
const TABLA_D = 'tbl_68_d_entrega_cargo';
const TABLA_H = 'tbl_66_herramienta_cargo';
const TABLA_DEV = 'tbl_69_devolucion_cargo';
const ESTADOS_DEV = new Set(['BUENA', 'REGULAR', 'DANADA', 'PERDIDA']);

const MAESTRO_SELECT = `
  SELECT
    m.identrega_67, m.folio_67, m.idtrabajador_67, m.idresponsable_67, m.idccosto_67,
    m.fecha_67, m.hora_67, m.estado_67, m.observacion_67, m.creado_en, m.actualizado_en,
    CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
    t.ruttrabajador_06 AS trabajador_rut,
    c.cargo_14 AS trabajador_cargo,
    CONCAT(
      COALESCE(r.nombreresponsableentrega_08, ''), ' ',
      COALESCE(r.apaternoresponsableentrega_08, ''), ' ',
      COALESCE(r.amaternoresponsableentrega_08, '')
    ) AS responsable_nombre,
    cc.ccosto_45 AS ccosto_nombre
  FROM ${TABLA_M} m
  INNER JOIN tbl_06_trabajador t ON m.idtrabajador_67 = t.idtrabajador_06
  LEFT JOIN tbl_14_cargo c ON t.idcargo_06 = c.idcargo_14
  INNER JOIN tbl_08_responsable_entrega r ON m.idresponsable_67 = r.idresponsableentrega_08
  INNER JOIN tbl_45_ccosto cc ON m.idccosto_67 = cc.id_ccosto_45
`;

const DETALLE_SELECT = `
  SELECT
    d.iddetalle_68, d.identrega_68, d.idherramienta_68, d.cantidad_68, d.cantidad_devuelta_68,
    d.estado_entrega_68, d.observacion_68,
    (d.cantidad_68 - d.cantidad_devuelta_68) AS pendiente,
    h.codigo_66 AS herramienta_codigo,
    h.nombre_66 AS herramienta_nombre,
    h.serie_66 AS herramienta_serie,
    h.valor_66 AS herramienta_valor,
    mi.marca_insumo_37 AS herramienta_marca
  FROM ${TABLA_D} d
  INNER JOIN ${TABLA_H} h ON d.idherramienta_68 = h.idherramienta_66
  LEFT JOIN tbl_37_marca_insumo mi ON h.idmarca_insumo_66 = mi.id_marca_insumo_37
`;

async function refrescarEstadoMaestro(
  client: { query: typeof pool.query },
  idEntrega: number
): Promise<void> {
  const r = await client.query<{ total: string; pendientes: string }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE cantidad_devuelta_68 < cantidad_68)::text AS pendientes
     FROM ${TABLA_D}
     WHERE identrega_68 = $1`,
    [idEntrega]
  );
  const total = Number(r.rows[0]?.total || 0);
  const pendientes = Number(r.rows[0]?.pendientes || 0);
  let estado = 'ACTIVA';
  if (total > 0 && pendientes === 0) estado = 'DEVUELTA';
  else if (pendientes > 0 && pendientes < total) estado = 'PARCIAL';
  else if (pendientes === total) {
    const algunaDev = await client.query(
      `SELECT 1 FROM ${TABLA_D} WHERE identrega_68 = $1 AND cantidad_devuelta_68 > 0 LIMIT 1`,
      [idEntrega]
    );
    estado = (algunaDev.rowCount ?? 0) > 0 ? 'PARCIAL' : 'ACTIVA';
  }
  await client.query(
    `UPDATE ${TABLA_M} SET estado_67 = $1, actualizado_en = CURRENT_TIMESTAMP WHERE identrega_67 = $2`,
    [estado, idEntrega]
  );
}

export const getAllEntregasCargo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MaestroEntregaCargo>(
      `${MAESTRO_SELECT} ORDER BY m.fecha_67 DESC, m.identrega_67 DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener entregas',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getEntregaCargoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const maestro = await pool.query<MaestroEntregaCargo>(
      `${MAESTRO_SELECT} WHERE m.identrega_67 = $1`,
      [id]
    );
    if (maestro.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }
    const detalles = await pool.query<DetalleEntregaCargo>(
      `${DETALLE_SELECT} WHERE d.identrega_68 = $1 ORDER BY d.iddetalle_68`,
      [id]
    );
    res.json({ success: true, data: { maestro: maestro.rows[0], detalles: detalles.rows } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la entrega',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getInventarioCargoVigente = async (req: Request, res: Response): Promise<void> => {
  try {
    const idTrabajador = req.query.idtrabajador ? Number(req.query.idtrabajador) : null;
    const params: unknown[] = [];
    let where = '';
    if (idTrabajador) {
      params.push(idTrabajador);
      where = ` AND m.idtrabajador_67 = $1`;
    }
    const result = await pool.query<InventarioCargoVigente>(
      `SELECT
         t.idtrabajador_06,
         CONCAT(t.nombre_06, ' ', COALESCE(t.apaterno_06, ''), ' ', COALESCE(t.amaterno_06, '')) AS trabajador_nombre,
         t.ruttrabajador_06 AS trabajador_rut,
         m.identrega_67,
         m.folio_67,
         d.iddetalle_68,
         h.idherramienta_66,
         h.codigo_66,
         h.nombre_66,
         h.valor_66,
         d.cantidad_68 AS cantidad_asignada,
         d.cantidad_devuelta_68 AS cantidad_devuelta,
         (d.cantidad_68 - d.cantidad_devuelta_68) AS cantidad_pendiente,
         m.fecha_67 AS fecha_entrega,
         cc.ccosto_45 AS ccosto_nombre
       FROM ${TABLA_D} d
       INNER JOIN ${TABLA_M} m ON d.identrega_68 = m.identrega_67
       INNER JOIN ${TABLA_H} h ON d.idherramienta_68 = h.idherramienta_66
       INNER JOIN tbl_06_trabajador t ON m.idtrabajador_67 = t.idtrabajador_06
       INNER JOIN tbl_45_ccosto cc ON m.idccosto_67 = cc.id_ccosto_45
       WHERE UPPER(TRIM(m.estado_67)) IN ('ACTIVA', 'PARCIAL')
         AND d.cantidad_devuelta_68 < d.cantidad_68
         ${where}
       ORDER BY t.apaterno_06, t.nombre_06, m.fecha_67 DESC, h.codigo_66`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener inventario vigente',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createEntregaCargo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateEntregaCargoDTO = req.body;
    if (!body.idtrabajador_67 || !body.idresponsable_67 || !body.idccosto_67) {
      res.status(400).json({
        success: false,
        error: 'Trabajador, responsable y centro de costo son requeridos',
      });
      return;
    }
    if (!body.detalles?.length) {
      res.status(400).json({ success: false, error: 'Debe agregar al menos una herramienta' });
      return;
    }

    const seen = new Set<number>();
    for (const d of body.detalles) {
      if (!d.idherramienta_68 || !d.cantidad_68 || d.cantidad_68 < 1) {
        res.status(400).json({ success: false, error: 'Cada línea debe tener herramienta y cantidad > 0' });
        return;
      }
      if (seen.has(d.idherramienta_68)) {
        res.status(400).json({ success: false, error: 'No repita la misma herramienta en el detalle' });
        return;
      }
      seen.add(d.idherramienta_68);
    }

    await client.query('BEGIN');

    for (const d of body.detalles) {
      const h = await client.query<{
        codigo_66: string;
        serie_66: string | null;
        stock_disponible_66: number;
        activo_66: boolean;
        estado_66: string;
      }>(
        `SELECT codigo_66, serie_66, stock_disponible_66, activo_66, estado_66
         FROM ${TABLA_H} WHERE idherramienta_66 = $1 FOR UPDATE`,
        [d.idherramienta_68]
      );
      if (h.rowCount === 0) throw new Error(`Herramienta ${d.idherramienta_68} no existe`);
      const row = h.rows[0];
      if (!row.activo_66) throw new Error(`${row.codigo_66} está inactiva`);
      if (['PERDIDA', 'DANADA', 'DE_BAJA', 'EN_MANTENCION'].includes(String(row.estado_66).toUpperCase())) {
        throw new Error(`${row.codigo_66} no está disponible (estado: ${row.estado_66})`);
      }
      if (row.serie_66 && Number(d.cantidad_68) !== 1) {
        throw new Error(`${row.codigo_66}: con serie la cantidad debe ser 1`);
      }
      if (Number(row.stock_disponible_66) < Number(d.cantidad_68)) {
        throw new Error(
          `${row.codigo_66}: stock insuficiente (disp: ${row.stock_disponible_66}, sol: ${d.cantidad_68})`
        );
      }
    }

    const ins = await client.query(
      `INSERT INTO ${TABLA_M} (
        idtrabajador_67, idresponsable_67, idccosto_67, fecha_67, hora_67, observacion_67, estado_67
      ) VALUES (
        $1, $2, $3,
        COALESCE($4::date, CURRENT_DATE),
        COALESCE($5::time, CURRENT_TIME),
        $6, 'ACTIVA'
      ) RETURNING identrega_67`,
      [
        body.idtrabajador_67,
        body.idresponsable_67,
        body.idccosto_67,
        body.fecha_67 || null,
        body.hora_67 || null,
        body.observacion_67?.trim() || null,
      ]
    );
    const idMaestro = ins.rows[0].identrega_67 as number;

    for (const d of body.detalles) {
      await client.query(
        `INSERT INTO ${TABLA_D} (
          identrega_68, idherramienta_68, cantidad_68, estado_entrega_68, observacion_68
        ) VALUES ($1,$2,$3,$4,$5)`,
        [
          idMaestro,
          d.idherramienta_68,
          d.cantidad_68,
          String(d.estado_entrega_68 || 'BUENA').toUpperCase(),
          d.observacion_68?.trim() || null,
        ]
      );
      await client.query(
        `UPDATE ${TABLA_H} SET
           stock_disponible_66 = stock_disponible_66 - $1,
           estado_66 = CASE
             WHEN stock_disponible_66 - $1 <= 0 THEN 'A_CARGO'
             ELSE estado_66
           END,
           actualizado_en = CURRENT_TIMESTAMP
         WHERE idherramienta_66 = $2`,
        [d.cantidad_68, d.idherramienta_68]
      );
    }

    await client.query('COMMIT');
    const maestro = await pool.query<MaestroEntregaCargo>(
      `${MAESTRO_SELECT} WHERE m.identrega_67 = $1`,
      [idMaestro]
    );
    const creado = maestro.rows[0];
    res.status(201).json({
      success: true,
      data: creado,
      message: `Entrega ${creado.folio_67 || ''} registrada. La herramienta quedó a cargo del trabajador. No vuelva a guardar el mismo registro.`,
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

export const createDevolucionCargo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const body: CreateDevolucionCargoDTO = req.body;
    if (!body.iddetalle_69 || !body.cantidad_69 || body.cantidad_69 < 1) {
      res.status(400).json({ success: false, error: 'Detalle y cantidad son requeridos' });
      return;
    }
    const estado = String(body.estado_herramienta_69 || '').toUpperCase();
    if (!ESTADOS_DEV.has(estado)) {
      res.status(400).json({
        success: false,
        error: 'Estado de devolución inválido (BUENA, REGULAR, DANADA, PERDIDA)',
      });
      return;
    }

    await client.query('BEGIN');
    const det = await client.query<{
      iddetalle_68: number;
      identrega_68: number;
      idherramienta_68: number;
      cantidad_68: number;
      cantidad_devuelta_68: number;
      estado_67: string;
    }>(
      `SELECT d.iddetalle_68, d.identrega_68, d.idherramienta_68, d.cantidad_68, d.cantidad_devuelta_68, m.estado_67
       FROM ${TABLA_D} d
       INNER JOIN ${TABLA_M} m ON m.identrega_67 = d.identrega_68
       WHERE d.iddetalle_68 = $1
       FOR UPDATE OF d`,
      [body.iddetalle_69]
    );
    if (det.rowCount === 0) throw new Error('Línea de entrega no encontrada');
    const line = det.rows[0];
    if (String(line.estado_67).toUpperCase() === 'ANULADA') {
      throw new Error('No se puede devolver una entrega anulada');
    }
    const pendiente = Number(line.cantidad_68) - Number(line.cantidad_devuelta_68);
    if (Number(body.cantidad_69) > pendiente) {
      throw new Error(`Solo hay ${pendiente} unidad(es) pendientes de devolver`);
    }

    await client.query(
      `INSERT INTO ${TABLA_DEV} (
        iddetalle_69, cantidad_69, fecha_69, hora_69, estado_herramienta_69, idresponsable_69, observacion_69
      ) VALUES (
        $1, $2,
        COALESCE($3::date, CURRENT_DATE),
        COALESCE($4::time, CURRENT_TIME),
        $5, $6, $7
      )`,
      [
        body.iddetalle_69,
        body.cantidad_69,
        body.fecha_69 || null,
        body.hora_69 || null,
        estado,
        body.idresponsable_69 || null,
        body.observacion_69?.trim() || null,
      ]
    );

    await client.query(
      `UPDATE ${TABLA_D}
       SET cantidad_devuelta_68 = cantidad_devuelta_68 + $1,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE iddetalle_68 = $2`,
      [body.cantidad_69, body.iddetalle_69]
    );

    if (estado === 'BUENA' || estado === 'REGULAR') {
      await client.query(
        `UPDATE ${TABLA_H} SET
           stock_disponible_66 = LEAST(stock_66, stock_disponible_66 + $1),
           estado_66 = CASE
             WHEN stock_disponible_66 + $1 > 0 THEN 'DISPONIBLE'
             ELSE estado_66
           END,
           actualizado_en = CURRENT_TIMESTAMP
         WHERE idherramienta_66 = $2`,
        [body.cantidad_69, line.idherramienta_68]
      );
    } else if (estado === 'PERDIDA') {
      await client.query(
        `UPDATE ${TABLA_H} SET
           estado_66 = 'PERDIDA',
           stock_66 = GREATEST(0, stock_66 - $1),
           actualizado_en = CURRENT_TIMESTAMP
         WHERE idherramienta_66 = $2`,
        [body.cantidad_69, line.idherramienta_68]
      );
    } else if (estado === 'DANADA') {
      await client.query(
        `UPDATE ${TABLA_H} SET
           estado_66 = 'DANADA',
           actualizado_en = CURRENT_TIMESTAMP
         WHERE idherramienta_66 = $2`,
        [body.cantidad_69, line.idherramienta_68]
      );
    }

    await refrescarEstadoMaestro(client, line.identrega_68);
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Devolución registrada' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al devolver',
    });
  } finally {
    client.release();
  }
};

/** Devolver todo lo pendiente de una entrega (todas las líneas) */
export const devolverTodoCargo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const estado = String(req.body?.estado_herramienta_69 || 'BUENA').toUpperCase();
    const idResponsable = req.body?.idresponsable_69 || null;
    const observacion = req.body?.observacion_69?.trim() || null;
    if (!ESTADOS_DEV.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de devolución inválido' });
      return;
    }

    await client.query('BEGIN');
    const lines = await client.query<{
      iddetalle_68: number;
      idherramienta_68: number;
      cantidad_68: number;
      cantidad_devuelta_68: number;
      estado_67: string;
    }>(
      `SELECT d.iddetalle_68, d.idherramienta_68, d.cantidad_68, d.cantidad_devuelta_68, m.estado_67
       FROM ${TABLA_D} d
       INNER JOIN ${TABLA_M} m ON m.identrega_67 = d.identrega_68
       WHERE d.identrega_68 = $1
       FOR UPDATE OF d`,
      [id]
    );
    if (lines.rowCount === 0) throw new Error('Entrega no encontrada o sin detalle');
    if (String(lines.rows[0].estado_67).toUpperCase() === 'ANULADA') {
      throw new Error('Entrega anulada');
    }

    let alguna = false;
    for (const line of lines.rows) {
      const pendiente = Number(line.cantidad_68) - Number(line.cantidad_devuelta_68);
      if (pendiente <= 0) continue;
      alguna = true;
      await client.query(
        `INSERT INTO ${TABLA_DEV} (
          iddetalle_69, cantidad_69, estado_herramienta_69, idresponsable_69, observacion_69
        ) VALUES ($1,$2,$3,$4,$5)`,
        [line.iddetalle_68, pendiente, estado, idResponsable, observacion]
      );
      await client.query(
        `UPDATE ${TABLA_D} SET cantidad_devuelta_68 = cantidad_68, actualizado_en = CURRENT_TIMESTAMP
         WHERE iddetalle_68 = $1`,
        [line.iddetalle_68]
      );
      if (estado === 'BUENA' || estado === 'REGULAR') {
        await client.query(
          `UPDATE ${TABLA_H} SET
             stock_disponible_66 = LEAST(stock_66, stock_disponible_66 + $1),
             estado_66 = CASE WHEN stock_disponible_66 + $1 > 0 THEN 'DISPONIBLE' ELSE estado_66 END,
             actualizado_en = CURRENT_TIMESTAMP
           WHERE idherramienta_66 = $2`,
          [pendiente, line.idherramienta_68]
        );
      } else if (estado === 'PERDIDA') {
        await client.query(
          `UPDATE ${TABLA_H} SET estado_66 = 'PERDIDA', stock_66 = GREATEST(0, stock_66 - $1), actualizado_en = CURRENT_TIMESTAMP
           WHERE idherramienta_66 = $2`,
          [pendiente, line.idherramienta_68]
        );
      } else if (estado === 'DANADA') {
        await client.query(
          `UPDATE ${TABLA_H} SET estado_66 = 'DANADA', actualizado_en = CURRENT_TIMESTAMP
           WHERE idherramienta_66 = $2`,
          [pendiente, line.idherramienta_68]
        );
      }
    }
    if (!alguna) throw new Error('No hay cantidades pendientes por devolver');
    await refrescarEstadoMaestro(client, Number(id));
    await client.query('COMMIT');
    res.json({ success: true, message: 'Devolución total registrada' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al devolver todo',
    });
  } finally {
    client.release();
  }
};

export const anularEntregaCargo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const m = await client.query<{ estado_67: string }>(
      `SELECT estado_67 FROM ${TABLA_M} WHERE identrega_67 = $1 FOR UPDATE`,
      [id]
    );
    if (m.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }
    if (String(m.rows[0].estado_67).toUpperCase() === 'ANULADA') {
      res.status(400).json({ success: false, error: 'Ya está anulada' });
      return;
    }
    const lines = await client.query<{
      idherramienta_68: number;
      cantidad_68: number;
      cantidad_devuelta_68: number;
    }>(`SELECT idherramienta_68, cantidad_68, cantidad_devuelta_68 FROM ${TABLA_D} WHERE identrega_68 = $1`, [id]);

    for (const line of lines.rows) {
      const pendiente = Number(line.cantidad_68) - Number(line.cantidad_devuelta_68);
      if (pendiente > 0) {
        await client.query(
          `UPDATE ${TABLA_H} SET
             stock_disponible_66 = LEAST(stock_66, stock_disponible_66 + $1),
             estado_66 = CASE WHEN stock_disponible_66 + $1 > 0 THEN 'DISPONIBLE' ELSE estado_66 END,
             actualizado_en = CURRENT_TIMESTAMP
           WHERE idherramienta_66 = $2`,
          [pendiente, line.idherramienta_68]
        );
      }
    }
    await client.query(
      `UPDATE ${TABLA_M} SET estado_67 = 'ANULADA', actualizado_en = CURRENT_TIMESTAMP WHERE identrega_67 = $1`,
      [id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Entrega anulada; stock pendiente restaurado' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al anular',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

function loadActaAssetDataUrl(fileName: string): string | null {
  try {
    const fullPath = path.join(__dirname, '../../assets/acta-epp', fileName);
    const base64 = fs.readFileSync(fullPath).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

function partesFechaEntrega(value: Date | string | null | undefined): {
  dia: number;
  mes: string;
  anio: number;
} {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      dia: value.getUTCDate(),
      mes: MESES[value.getUTCMonth()] || 'enero',
      anio: value.getUTCFullYear(),
    };
  }
  const raw = String(value ?? '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const anio = Number(iso[1]);
    const mesNum = Number(iso[2]);
    const dia = Number(iso[3]);
    return { dia, mes: MESES[mesNum - 1] || 'enero', anio };
  }
  const hoy = new Date();
  return {
    dia: hoy.getDate(),
    mes: MESES[hoy.getMonth()] || 'enero',
    anio: hoy.getFullYear(),
  };
}

function formatFechaCorta(value: Date | string | null | undefined): string {
  const { dia, mes, anio } = partesFechaEntrega(value);
  const mm = String(MESES.indexOf(mes) + 1).padStart(2, '0');
  return `${String(dia).padStart(2, '0')}/${mm}/${String(anio).slice(-2)}`;
}

function formatClp(value: unknown): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function stampArchivoActa(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const normalized = formatted.replace('T', ' ');
  const [fechaPart, horaPart = '00:00'] = normalized.split(' ');
  const [anio, mes, dia] = fechaPart.split('-');
  const [hh, mm] = horaPart.split(':');
  return `${anio.slice(-2)}${mes}${dia}_${hh}${mm}`;
}

type ActaHerramientaCargo = {
  codigoDoc: string;
  versionDoc: string;
  titulo: string;
  folio: string;
  intro: { dia: number; mes: string; anio: number };
  empresaLegal: { nombre: string; rut: string };
  trabajador: { nombre: string; rut: string; cargo: string; ccosto: string };
  fechaEntrega: string;
  herramientas: Array<{
    codigo: string;
    nombre: string;
    marca: string;
    serie: string;
    cantidad: number;
    valor: number;
    valorFmt: string;
  }>;
  observacion: string | null;
  declaraciones: {
    intro: string;
    compromisos: string[];
    cierre: string;
  };
  firmas: {
    trabajadorNombre: string;
    trabajadorRut: string;
    encargadoNombre: string;
    encargadoRut: string;
  };
};

async function cargarDatosActaCargo(id: string): Promise<ActaHerramientaCargo | null> {
  const maestro = await pool.query<MaestroEntregaCargo>(
    `${MAESTRO_SELECT} WHERE m.identrega_67 = $1`,
    [id]
  );
  if (maestro.rowCount === 0) return null;

  const detalles = await pool.query<
    DetalleEntregaCargo & { herramienta_valor?: number; herramienta_marca?: string | null }
  >(
    `${DETALLE_SELECT} WHERE d.identrega_68 = $1 ORDER BY d.iddetalle_68`,
    [id]
  );
  const m = maestro.rows[0];
  const nombre = (m.trabajador_nombre || '').trim();
  const rut = m.trabajador_rut || '';

  return {
    codigoDoc: CODIGO_DOC,
    versionDoc: VERSION_DOC,
    titulo: 'ANEXO DE ENTREGA DE HERRAMIENTAS DE TRABAJO',
    folio: m.folio_67 || String(m.identrega_67),
    intro: partesFechaEntrega(m.fecha_67),
    empresaLegal: EMPRESA_LEGAL,
    trabajador: {
      nombre,
      rut,
      cargo: m.trabajador_cargo || '',
      ccosto: m.ccosto_nombre || '',
    },
    fechaEntrega: formatFechaCorta(m.fecha_67),
    herramientas: detalles.rows.map((d) => ({
      codigo: d.herramienta_codigo || '',
      nombre: d.herramienta_nombre || '',
      marca: d.herramienta_marca || '',
      serie: d.herramienta_serie || '',
      cantidad: Number(d.cantidad_68 || 0),
      valor: Number(d.herramienta_valor || 0),
      valorFmt: formatClp(d.herramienta_valor),
    })),
    observacion: m.observacion_67 || null,
    declaraciones: {
      intro:
        'El trabajador declara haber recibido los elementos antes descritos en buen estado de funcionamiento y se compromete a:',
      compromisos: COMPROMISOS_ACTA,
      cierre:
        'Las partes firman la presente acta en señal de conformidad, quedando una copia en poder de cada una de ellas.',
    },
    firmas: {
      trabajadorNombre: nombre,
      trabajadorRut: rut,
      encargadoNombre: ENCARGADO_BODEGA.nombre,
      encargadoRut: ENCARGADO_BODEGA.rut,
    },
  };
}

export const getActaDatosEntregaCargo = async (req: Request, res: Response): Promise<void> => {
  try {
    const acta = await cargarDatosActaCargo(req.params.id);
    if (!acta) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }
    res.json({ success: true, data: acta });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener los datos del acta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getActaPdfEntregaCargo = async (req: Request, res: Response): Promise<void> => {
  try {
    const acta = await cargarDatosActaCargo(req.params.id);
    if (!acta) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const printer = new PdfPrinter(fonts);
    const logoDataUrl = loadActaAssetDataUrl('logo-transantin.png');

    const labelCell = (text: string) => ({
      text,
      fillColor: '#555555',
      color: '#ffffff',
      bold: true,
      fontSize: 8,
      margin: [5, 6, 5, 6],
      alignment: 'left' as const,
    });
    const valueCell = (text: string) => ({
      text: text || ' ',
      fontSize: 9,
      margin: [5, 6, 5, 6],
      alignment: 'left' as const,
    });
    const tableLayout = {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => '#888888',
      vLineColor: () => '#888888',
    };

    const itemsHeader = [
      { text: 'Nº', style: 'gridHeader', alignment: 'center' },
      { text: 'Herramienta / equipo', style: 'gridHeader', alignment: 'center' },
      { text: 'Marca', style: 'gridHeader', alignment: 'center' },
      { text: 'Cant.', style: 'gridHeader', alignment: 'center' },
      { text: 'Valor', style: 'gridHeader', alignment: 'center' },
      { text: 'Fecha de Entrega\n(DD/MM/AA)', style: 'gridHeader', alignment: 'center' },
    ];
    const itemsBody: unknown[] = [itemsHeader];
    acta.herramientas.forEach((h, index) => {
      const nombre = [h.nombre, h.serie ? `Serie ${h.serie}` : '']
        .filter(Boolean)
        .join(' — ');
      itemsBody.push([
        { text: String(index + 1).padStart(2, '0'), style: 'gridCell', alignment: 'center' },
        { text: nombre || '—', style: 'gridCell' },
        { text: h.marca || '—', style: 'gridCell', alignment: 'center' },
        { text: String(h.cantidad), style: 'gridCell', alignment: 'center' },
        { text: h.valorFmt, style: 'gridCell', alignment: 'right' },
        { text: acta.fechaEntrega, style: 'gridCell', alignment: 'center' },
      ]);
    });
    if (itemsBody.length === 1) {
      itemsBody.push([
        { text: '', style: 'gridCell' },
        { text: '', style: 'gridCell' },
        { text: '', style: 'gridCell' },
        { text: '', style: 'gridCell' },
        { text: '', style: 'gridCell' },
        { text: '', style: 'gridCell' },
      ]);
    }

    const headerCols: unknown[] = [];
    if (logoDataUrl) {
      headerCols.push({ image: logoDataUrl, width: 110, margin: [0, 0, 12, 0] });
    } else {
      headerCols.push({
        text: 'TranSantin',
        fontSize: 14,
        bold: true,
        color: '#1d4ed8',
        width: 110,
      });
    }
    headerCols.push({
      stack: [
        {
          text: acta.titulo,
          fontSize: 12,
          bold: true,
          alignment: 'center',
          color: '#111111',
          margin: [0, 8, 0, 0],
        },
      ],
      width: '*',
    });

    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [48, 42, 48, 48],
      content: [
        {
          text: `${acta.codigoDoc}\nVersión ${acta.versionDoc}`,
          fontSize: 8,
          color: '#888888',
          alignment: 'right',
          margin: [0, 0, 0, 10],
        },
        { columns: headerCols, margin: [0, 0, 0, 14] },
        {
          text: [
            { text: 'A ', fontSize: 10 },
            { text: String(acta.intro.dia), bold: true, fontSize: 10 },
            { text: ' de ', fontSize: 10 },
            { text: String(acta.intro.mes), bold: true, fontSize: 10 },
            { text: ' de ', fontSize: 10 },
            { text: String(acta.intro.anio), bold: true, fontSize: 10 },
            { text: ', la ', fontSize: 10 },
            { text: acta.empresaLegal.nombre, bold: true, fontSize: 10 },
            { text: ', Rut ', fontSize: 10 },
            { text: acta.empresaLegal.rut, bold: true, fontSize: 10 },
            {
              text:
                ' hace entrega de las siguientes herramientas y/o equipos de trabajo para el desempeño de sus funciones laborales a Don(ña) ',
              fontSize: 10,
            },
            { text: acta.trabajador.nombre || '—', bold: true, fontSize: 10 },
            { text: ', cédula de identidad ', fontSize: 10 },
            { text: acta.trabajador.rut || '—', bold: true, fontSize: 10 },
            { text: '.', fontSize: 10 },
          ],
          alignment: 'justify',
          lineHeight: 1.35,
          margin: [0, 0, 0, 14],
        },
        {
          text: 'Datos del Trabajador',
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 0, 0, 6],
        },
        {
          table: {
            widths: [70, '*', 80, '*'],
            body: [
              [
                labelCell('Nombre'),
                valueCell(acta.trabajador.nombre),
                labelCell('Cargo'),
                valueCell(acta.trabajador.cargo),
              ],
              [
                labelCell('RUT'),
                valueCell(acta.trabajador.rut),
                labelCell('CCosto'),
                valueCell(acta.trabajador.ccosto),
              ],
            ],
          },
          layout: tableLayout,
          margin: [0, 0, 0, 14],
        },
        {
          text: 'Detalle de las herramientas de trabajo',
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 0, 0, 6],
        },
        {
          table: {
            headerRows: 1,
            widths: [28, '*', 70, 40, 70, 80],
            body: itemsBody,
          },
          layout: {
            ...tableLayout,
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#555555' : null),
          },
          margin: [0, 0, 0, 12],
        },
        acta.observacion
          ? {
              text: `Observaciones: ${acta.observacion}`,
              fontSize: 9,
              margin: [0, 0, 0, 12],
            }
          : { text: '' },
        {
          text: 'Declaraciones del trabajador',
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 4, 0, 4],
        },
        {
          text: acta.declaraciones.intro,
          fontSize: 9,
          alignment: 'justify',
          margin: [0, 0, 0, 6],
        },
        {
          ol: acta.declaraciones.compromisos.map((text) => ({
            text,
            margin: [0, 0, 0, 10],
            lineHeight: 1.45,
          })),
          fontSize: 9,
          color: '#222222',
          margin: [0, 4, 0, 16],
        },
        {
          text: acta.declaraciones.cierre,
          fontSize: 9,
          alignment: 'justify',
          lineHeight: 1.35,
          margin: [0, 0, 0, 18],
        },
        {
          text: 'Firmado digitalmente por:',
          fontSize: 10,
          bold: true,
          color: '#111111',
          margin: [0, 0, 0, 6],
        },
        {
          text: `Trabajador: ${acta.firmas.trabajadorNombre || '—'}, cédula de identidad ${acta.firmas.trabajadorRut || '—'}`,
          fontSize: 9,
          margin: [0, 0, 0, 4],
        },
        {
          text: `Encargado de Bodega: ${acta.firmas.encargadoNombre}, cédula de identidad ${acta.firmas.encargadoRut}`,
          fontSize: 9,
        },
        {
          text: `Folio: ${acta.folio}`,
          fontSize: 8,
          color: '#888888',
          margin: [0, 16, 0, 0],
        },
      ],
      footer: (currentPage: number, pageCount: number) => ({
        text: `${acta.codigoDoc} · Versión ${acta.versionDoc} · Página ${currentPage} de ${pageCount}`,
        fontSize: 7,
        color: '#999999',
        alignment: 'center',
        margin: [48, 0, 48, 0],
      }),
      styles: {
        gridHeader: { fontSize: 8, bold: true, color: '#ffffff', margin: [2, 5, 2, 5] },
        gridCell: { fontSize: 8, margin: [3, 6, 3, 6] },
      },
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#111111' },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const filename = `anexo_entrega_herramientas_${acta.folio}_${stampArchivoActa()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar PDF',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
