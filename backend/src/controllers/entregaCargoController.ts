import { Request, Response } from 'express';
import PdfPrinter from 'pdfmake';
import { pool } from '../db.js';
import {
  CreateDevolucionCargoDTO,
  CreateEntregaCargoDTO,
  DetalleEntregaCargo,
  InventarioCargoVigente,
  MaestroEntregaCargo,
} from '../types.js';

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
    c.nombrecargo_14 AS trabajador_cargo,
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
    h.serie_66 AS herramienta_serie
  FROM ${TABLA_D} d
  INNER JOIN ${TABLA_H} h ON d.idherramienta_68 = h.idherramienta_66
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
    res.status(201).json({
      success: true,
      data: maestro.rows[0],
      message: 'Entrega a cargo creada',
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

export const getActaPdfEntregaCargo = async (req: Request, res: Response): Promise<void> => {
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
    const m = maestro.rows[0];
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    const printer = new PdfPrinter(fonts);

    const bodyRows = [
      [
        { text: 'Código', bold: true },
        { text: 'Herramienta', bold: true },
        { text: 'Serie', bold: true },
        { text: 'Cant.', bold: true },
        { text: 'Estado', bold: true },
      ],
      ...detalles.rows.map((d) => [
        d.herramienta_codigo || '',
        d.herramienta_nombre || '',
        d.herramienta_serie || '—',
        String(d.cantidad_68),
        d.estado_entrega_68 || '',
      ]),
    ];

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 40],
      content: [
        { text: 'ACTA DE ENTREGA DE HERRAMIENTAS A CARGO', style: 'title', alignment: 'center' },
        { text: `Folio: ${m.folio_67 || id}`, margin: [0, 8, 0, 4] },
        {
          text: `Fecha: ${String(m.fecha_67).slice(0, 10)}  Hora: ${String(m.hora_67).slice(0, 5)}`,
          margin: [0, 0, 0, 10],
        },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Trabajador', bold: true },
                { text: m.trabajador_nombre || '—' },
                { text: `RUT: ${m.trabajador_rut || '—'}` },
                { text: `Cargo: ${m.trabajador_cargo || '—'}` },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Responsable entrega', bold: true },
                { text: m.responsable_nombre || '—' },
                { text: `CCosto: ${m.ccosto_nombre || '—'}` },
                { text: `Estado doc.: ${m.estado_67}` },
              ],
            },
          ],
          margin: [0, 0, 0, 14],
        },
        {
          table: { headerRows: 1, widths: [70, '*', 70, 40, 55], body: bodyRows },
          layout: 'lightHorizontalLines',
        },
        {
          text:
            m.observacion_67
              ? `Observaciones: ${m.observacion_67}`
              : 'Observaciones: —',
          margin: [0, 14, 0, 0],
        },
        {
          text:
            'El trabajador recibe las herramientas detalladas bajo su responsabilidad (a cargo), ' +
            'debiendo devolverlas en buen estado al desvincularse o cuando la empresa lo requiera.',
          margin: [0, 16, 0, 0],
          fontSize: 9,
        },
      ],
      styles: {
        title: { fontSize: 13, bold: true },
      },
      defaultStyle: { font: 'Roboto', fontSize: 10 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (c) => chunks.push(c));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="acta_herramienta_cargo_${m.folio_67 || id}.pdf"`
      );
      res.send(pdfBuffer);
    });
    pdfDoc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar PDF',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
