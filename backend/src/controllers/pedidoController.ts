import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import PdfPrinter from 'pdfmake';
import { pool } from '../db.js';
import type { PdfDocumentDefinition } from '../utils/pdfTypes.js';

const PAGOS = new Set(['Pendiente', 'Pagado', 'Parcial', 'Anulado']);

type LineaIn = {
  id_detalle_91?: number | null;
  cod_insumo_91: number | null;
  descripcion_libre_91: string | null;
  id_proveedor_91: number | null;
  cantidad_solicitada_91: number;
  precio_unitario_91?: number | null;
  observaciones_det_91?: string | null;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cantidadEntera(value: unknown): number {
  const n = Math.round(num(value));
  return n > 0 ? n : 0;
}

function pendienteOperativo(row: {
  cantidad_solicitada_91?: unknown;
  cantidad_recibida_91?: unknown;
  cantidad_pasada_91?: unknown;
  cantidad_baja_91?: unknown;
}): number {
  return Math.max(
    0,
    cantidadEntera(row.cantidad_solicitada_91)
      - num(row.cantidad_recibida_91)
      - num(row.cantidad_pasada_91)
      - num(row.cantidad_baja_91)
  );
}

function upper(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  return t || null;
}

function usuario(req: Request): string {
  return req.authUser?.username || 'sistema';
}

async function proveedorActivo(id: number): Promise<boolean> {
  const r = await pool.query(
    'SELECT activo_90 FROM tbl_90_proveedor WHERE id_proveedor_90 = $1',
    [id]
  );
  return (r.rowCount ?? 0) > 0 && r.rows[0].activo_90 !== false;
}

async function responsableExiste(id: number): Promise<boolean> {
  const r = await pool.query(
    'SELECT 1 FROM tbl_08_responsable_entrega WHERE idresponsableentrega_08 = $1',
    [id]
  );
  return (r.rowCount ?? 0) > 0;
}

async function skuExiste(id: number): Promise<boolean> {
  const r = await pool.query(
    'SELECT 1 FROM tbl_89_codigo_etiqueta WHERE idcodigo_89 = $1 AND COALESCE(activo_89, true) = true',
    [id]
  );
  return (r.rowCount ?? 0) > 0;
}

const SELECT_CAB = `
  SELECT c.*,
         p.razon_social_90 AS proveedor_nombre,
         p.tipo_despacho_90,
         CONCAT_WS(' ', r.nombreresponsableentrega_08, r.apaternoresponsableentrega_08, r.amaternoresponsableentrega_08)
           AS responsable_nombre
  FROM tbl_92_pedido_cabecera c
  JOIN tbl_90_proveedor p ON c.id_proveedor_92 = p.id_proveedor_90
  JOIN tbl_08_responsable_entrega r ON c.id_responsable_92 = r.idresponsableentrega_08
`;

const SELECT_DET = `
  SELECT d.*,
         e.codigo_89,
         COALESCE(e.descripcion_89, d.descripcion_libre_91) AS descripcion_89,
         COALESCE(pl.razon_social_90, e.proveedor_89) AS proveedor_89,
         wa.fecha_envio_wa,
         origen_cab.numero_orden_92 AS pedido_origen_92
  FROM tbl_91_pedido_detalle d
  LEFT JOIN tbl_89_codigo_etiqueta e ON d.cod_insumo_91 = e.idcodigo_89
  LEFT JOIN tbl_90_proveedor pl ON d.id_proveedor_91 = pl.id_proveedor_90
  LEFT JOIN tbl_91_pedido_detalle orig ON orig.id_detalle_91 = d.id_detalle_origen_91
  LEFT JOIN tbl_92_pedido_cabecera origen_cab ON origen_cab.id_pedido_92 = orig.id_pedido_91
  LEFT JOIN (
    SELECT det.id_detalle_99, MIN(ev.fecha_envio_98) AS fecha_envio_wa
    FROM tbl_99_pedido_envio_wa_det det
    JOIN tbl_98_pedido_envio_wa ev ON ev.id_envio_98 = det.id_envio_99
    GROUP BY det.id_detalle_99
  ) wa ON wa.id_detalle_99 = d.id_detalle_91
  WHERE d.id_pedido_91 = $1
  ORDER BY d.id_detalle_91
`;

function cicloCerrado(estadoRecepcion: unknown, estadoPago?: unknown): boolean {
  const rec = String(estadoRecepcion || '');
  const pago = String(estadoPago || '');
  return pago === 'Anulado' || rec === 'Anulado' || rec === 'Recibido' || rec === 'Cerrada';
}

function claveConsolidar(d: {
  cod_insumo_91?: number | null;
  descripcion_libre_91?: string | null;
  descripcion_89?: string | null;
  id_proveedor_91?: number | null;
}): string {
  const sku = num(d.cod_insumo_91);
  const prov = num(d.id_proveedor_91);
  if (sku) return `s:${sku}:${prov}`;
  const desc = upper(d.descripcion_libre_91 || d.descripcion_89) || '';
  return `t:${desc}:${prov}`;
}

async function cargarEnviosWhatsApp(idPedido: string | number) {
  const r = await pool.query(
    `SELECT e.*,
            COALESCE((
              SELECT json_agg(json_build_object('id_detalle_99', d.id_detalle_99) ORDER BY d.id_envio_det_99)
              FROM tbl_99_pedido_envio_wa_det d
              WHERE d.id_envio_99 = e.id_envio_98
            ), '[]'::json) AS lineas
     FROM tbl_98_pedido_envio_wa e
     WHERE e.id_pedido_98 = $1
     ORDER BY e.fecha_envio_98 ASC, e.id_envio_98 ASC`,
    [idPedido]
  );
  return r.rows;
}

async function cargarPedido(id: string | number) {
  const cab = await pool.query(`${SELECT_CAB} WHERE c.id_pedido_92 = $1`, [id]);
  if ((cab.rowCount ?? 0) === 0) return null;
  const det = await pool.query(SELECT_DET, [id]);
  const envios = await cargarEnviosWhatsApp(id);
  return { ...cab.rows[0], detalles: det.rows, envios_whatsapp: envios };
}

async function recalcularRecepcion(client: PoolClient, idPedido: number): Promise<void> {
  const cab = await client.query(
    `SELECT estado_recepcion_92 FROM tbl_92_pedido_cabecera WHERE id_pedido_92 = $1`,
    [idPedido]
  );
  const actual = String(cab.rows[0]?.estado_recepcion_92 || 'Pendiente');
  if (actual === 'Anulado' || actual === 'Cerrada') return;
  const r = await client.query(
    `SELECT
       COALESCE(SUM(cantidad_solicitada_91), 0) AS sol,
       COALESCE(SUM(cantidad_recibida_91), 0) AS rec,
       COALESCE(SUM(cantidad_pasada_91), 0) AS pas,
       COALESCE(SUM(cantidad_baja_91), 0) AS baja
     FROM tbl_91_pedido_detalle
     WHERE id_pedido_91 = $1`,
    [idPedido]
  );
  const sol = num(r.rows[0]?.sol);
  const rec = num(r.rows[0]?.rec);
  const pas = num(r.rows[0]?.pas);
  const baja = num(r.rows[0]?.baja);
  const pend = sol - rec - pas - baja;
  let next = 'Pendiente';
  if (pend <= 0) next = rec >= sol && sol > 0 ? 'Recibido' : 'Cerrada';
  else if (rec > 0 || pas > 0 || baja > 0) next = 'Parcial';
  else if (actual === 'No retirado') next = 'No retirado';
  await client.query(
    `UPDATE tbl_92_pedido_cabecera
     SET estado_recepcion_92 = $2,
         fecha_retiro_92 = CASE
           WHEN $2 IN ('Recibido', 'Cerrada') THEN COALESCE(fecha_retiro_92, CURRENT_DATE)
           ELSE fecha_retiro_92
         END
     WHERE id_pedido_92 = $1`,
    [idPedido, next]
  );
}

function parseLineas(raw: unknown): LineaIn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lineas: LineaIn[] = [];
  for (const row of raw) {
    const sku = num(row.cod_insumo_91) || 0;
    const desc = upper(row.descripcion_libre_91);
    const qty = cantidadEntera(row.cantidad_solicitada_91);
    if (qty <= 0) return null;
    if (!sku && !desc) return null;
    const idProv = num(row.id_proveedor_91) || 0;
    const idDet = num(row.id_detalle_91) || 0;
    lineas.push({
      id_detalle_91: idDet || null,
      cod_insumo_91: sku || null,
      descripcion_libre_91: sku ? null : (desc ? desc.slice(0, 200) : null),
      id_proveedor_91: idProv || null,
      cantidad_solicitada_91: qty,
      precio_unitario_91: row.precio_unitario_91 == null || row.precio_unitario_91 === '' ? null : num(row.precio_unitario_91),
      observaciones_det_91: upper(row.observaciones_det_91),
    });
  }
  return lineas;
}

async function validarLineas(lineas: LineaIn[]): Promise<string | null> {
  for (const ln of lineas) {
    if (ln.cod_insumo_91 && !(await skuExiste(ln.cod_insumo_91))) {
      return `SKU ${ln.cod_insumo_91} no está activo en etiquetas`;
    }
    if (!ln.cod_insumo_91 && !ln.id_proveedor_91) {
      return `La línea "${ln.descripcion_libre_91}" necesita un proveedor del catálogo`;
    }
    if (ln.id_proveedor_91 && !(await proveedorActivo(ln.id_proveedor_91))) {
      return 'Seleccione un proveedor activo en la línea';
    }
  }
  return null;
}

export const getAllPedidos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`${SELECT_CAB} ORDER BY c.fecha_pedido_92 DESC, c.id_pedido_92 DESC`);
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener pedidos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getVerificadorPedidos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM v_verificador_pedidos
       ORDER BY fecha_pedido_92 DESC, id_pedido_92 DESC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el verificador',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getPedidoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await cargarPedido(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el pedido',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getHistorialPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM tbl_94_historial_estado_pedido
       WHERE id_pedido_94 = $1
       ORDER BY fecha_modificacion_94 DESC, id_historial_94 DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el historial',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createPedido = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idProveedor = num(req.body.id_proveedor_92);
    const idResponsable = num(req.body.id_responsable_92);
    const lineas = parseLineas(req.body.detalles);
    if (!idProveedor || !idResponsable || !lineas) {
      res.status(400).json({
        success: false,
        error: 'Proveedor, responsable y al menos una línea válida son requeridos',
      });
      return;
    }
    if (!(await proveedorActivo(idProveedor))) {
      res.status(400).json({ success: false, error: 'Seleccione un proveedor activo' });
      return;
    }
    if (!(await responsableExiste(idResponsable))) {
      res.status(400).json({ success: false, error: 'Seleccione un responsable vigente' });
      return;
    }
    const errorLinea = await validarLineas(lineas);
    if (errorLinea) {
      res.status(400).json({ success: false, error: errorLinea });
      return;
    }

    await client.query('BEGIN');
    const cab = await client.query(
      `INSERT INTO tbl_92_pedido_cabecera (
         id_proveedor_92, id_responsable_92, numero_orden_92, fecha_pedido_92,
         observaciones_cab_92, usuario_creacion_92
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_pedido_92`,
      [
        idProveedor,
        idResponsable,
        upper(req.body.numero_orden_92),
        req.body.fecha_pedido_92 || new Date().toISOString().slice(0, 10),
        upper(req.body.observaciones_cab_92),
        usuario(req),
      ]
    );
    const idPedido = cab.rows[0].id_pedido_92 as number;
    const numero = upper(req.body.numero_orden_92) || `PED-${String(idPedido).padStart(6, '0')}`;
    await client.query(
      `UPDATE tbl_92_pedido_cabecera SET numero_orden_92 = $2 WHERE id_pedido_92 = $1`,
      [idPedido, numero]
    );
    for (const ln of lineas) {
      await client.query(
        `INSERT INTO tbl_91_pedido_detalle (
           id_pedido_91, cod_insumo_91, descripcion_libre_91, id_proveedor_91, cantidad_solicitada_91, precio_unitario_91, observaciones_det_91
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [idPedido, ln.cod_insumo_91, ln.descripcion_libre_91, ln.id_proveedor_91, ln.cantidad_solicitada_91, ln.precio_unitario_91, ln.observaciones_det_91]
      );
    }
    await client.query('COMMIT');
    const data = await cargarPedido(idPedido);
    res.status(201).json({ success: true, data, message: `Pedido ${numero} creado` });
  } catch (error) {
    await client.query('ROLLBACK');
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /unique/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Número de orden duplicado' : 'Error al crear el pedido',
      message: msg,
    });
  } finally {
    client.release();
  }
};

export const updatePedido = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const id = num(req.params.id);
    const actual = await cargarPedido(id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (cicloCerrado(actual.estado_recepcion_92, actual.estado_pago_92)) {
      res.status(400).json({ success: false, error: 'No se edita un pedido cerrado, recibido o anulado' });
      return;
    }
    const recibida = (actual.detalles as Array<{ cantidad_recibida_91: number }>).some(
      (d) => num(d.cantidad_recibida_91) > 0
    );
    if (recibida) {
      res.status(400).json({ success: false, error: 'Ya hay recepción: no se editan las líneas' });
      return;
    }
    const idProveedor = num(req.body.id_proveedor_92);
    const idResponsable = num(req.body.id_responsable_92);
    const lineas = parseLineas(req.body.detalles);
    if (!idProveedor || !idResponsable || !lineas) {
      res.status(400).json({ success: false, error: 'Proveedor, responsable y líneas son requeridos' });
      return;
    }
    const errorLinea = await validarLineas(lineas);
    if (errorLinea) {
      res.status(400).json({ success: false, error: errorLinea });
      return;
    }
    const idsExistentes = new Set(
      (actual.detalles as Array<{ id_detalle_91: number }>).map((d) => Number(d.id_detalle_91))
    );
    const idsConservar: number[] = [];
    for (const ln of lineas) {
      const idDet = ln.id_detalle_91 && idsExistentes.has(Number(ln.id_detalle_91)) ? Number(ln.id_detalle_91) : 0;
      if (idDet) idsConservar.push(idDet);
    }
    await client.query('BEGIN');
    await client.query(
      `UPDATE tbl_92_pedido_cabecera
       SET id_proveedor_92 = $2,
           id_responsable_92 = $3,
           fecha_pedido_92 = $4,
           observaciones_cab_92 = $5,
           numero_orden_92 = COALESCE($6, numero_orden_92)
       WHERE id_pedido_92 = $1`,
      [
        id,
        idProveedor,
        idResponsable,
        req.body.fecha_pedido_92 || actual.fecha_pedido_92,
        upper(req.body.observaciones_cab_92),
        upper(req.body.numero_orden_92),
      ]
    );
    if (idsConservar.length === 0) {
      await client.query('DELETE FROM tbl_91_pedido_detalle WHERE id_pedido_91 = $1', [id]);
    } else {
      await client.query(
        `DELETE FROM tbl_91_pedido_detalle
         WHERE id_pedido_91 = $1 AND NOT (id_detalle_91 = ANY($2::int[]))`,
        [id, idsConservar]
      );
    }
    for (const ln of lineas) {
      const idDet = ln.id_detalle_91 && idsExistentes.has(Number(ln.id_detalle_91)) ? Number(ln.id_detalle_91) : 0;
      if (idDet) {
        await client.query(
          `UPDATE tbl_91_pedido_detalle
           SET cod_insumo_91 = $2,
               descripcion_libre_91 = $3,
               id_proveedor_91 = $4,
               cantidad_solicitada_91 = $5,
               precio_unitario_91 = $6,
               observaciones_det_91 = $7
           WHERE id_detalle_91 = $1 AND id_pedido_91 = $8`,
          [
            idDet,
            ln.cod_insumo_91,
            ln.descripcion_libre_91,
            ln.id_proveedor_91,
            ln.cantidad_solicitada_91,
            ln.precio_unitario_91,
            ln.observaciones_det_91,
            id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO tbl_91_pedido_detalle (
             id_pedido_91, cod_insumo_91, descripcion_libre_91, id_proveedor_91, cantidad_solicitada_91, precio_unitario_91, observaciones_det_91
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, ln.cod_insumo_91, ln.descripcion_libre_91, ln.id_proveedor_91, ln.cantidad_solicitada_91, ln.precio_unitario_91, ln.observaciones_det_91]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, data: await cargarPedido(id), message: 'Pedido actualizado' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el pedido',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deletePedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarPedido(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (cicloCerrado(actual.estado_recepcion_92, actual.estado_pago_92)) {
      res.status(400).json({ success: false, error: 'No se elimina un pedido cerrado. Ábralo con el filtro Cerradas.' });
      return;
    }
    const recibida = (actual.detalles as Array<{ cantidad_recibida_91: number }>).some(
      (d) => num(d.cantidad_recibida_91) > 0
    );
    if (recibida) {
      res.status(400).json({ success: false, error: 'No se elimina un pedido con recepción. Anúlelo si corresponde.' });
      return;
    }
    await pool.query('DELETE FROM tbl_92_pedido_cabecera WHERE id_pedido_92 = $1', [req.params.id]);
    res.json({ success: true, message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el pedido',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const registrarRecepcion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idPedido = num(req.params.id);
    const idDetalle = num(req.body.id_detalle_91);
    const cantidad = cantidadEntera(req.body.cantidad_recibida_93);
    const idResp = num(req.body.id_responsable_recibe_93);
    if (!idDetalle || cantidad < 1 || !idResp) {
      res.status(400).json({ success: false, error: 'Detalle, cantidad y responsable que recibe son requeridos' });
      return;
    }
    if (!(await responsableExiste(idResp))) {
      res.status(400).json({ success: false, error: 'Responsable de recepción inválido' });
      return;
    }
    await client.query('BEGIN');
    const det = await client.query(
      `SELECT d.*, c.estado_recepcion_92, c.estado_pago_92
       FROM tbl_91_pedido_detalle d
       JOIN tbl_92_pedido_cabecera c ON c.id_pedido_92 = d.id_pedido_91
       WHERE d.id_detalle_91 = $1 AND d.id_pedido_91 = $2
       FOR UPDATE`,
      [idDetalle, idPedido]
    );
    if ((det.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Línea no encontrada en este pedido' });
      return;
    }
    const row = det.rows[0];
    if (cicloCerrado(row.estado_recepcion_92, row.estado_pago_92)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Pedido cerrado: no se registra recepción aquí' });
      return;
    }
    const pendiente = pendienteOperativo(row);
    if (cantidad > pendiente) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: `Solo quedan ${pendiente} por recibir` });
      return;
    }
    await client.query(
      `INSERT INTO tbl_93_recepcion_parcial (
         id_detalle_93, cantidad_recibida_93, id_responsable_recibe_93, observaciones_rec_93
       ) VALUES ($1, $2, $3, $4)`,
      [idDetalle, cantidad, idResp, upper(req.body.observaciones_rec_93)]
    );
    await client.query(
      `UPDATE tbl_91_pedido_detalle
       SET cantidad_recibida_91 = cantidad_recibida_91 + $2
       WHERE id_detalle_91 = $1`,
      [idDetalle, cantidad]
    );
    await recalcularRecepcion(client, idPedido);
    await client.query('COMMIT');
    res.json({ success: true, data: await cargarPedido(idPedido), message: 'Recepción registrada' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al registrar la recepción',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const registrarPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const estado = String(req.body.estado_pago_92 || '').trim();
    if (!PAGOS.has(estado) || estado === 'Anulado') {
      res.status(400).json({ success: false, error: 'Estado de pago inválido (use Pendiente, Parcial o Pagado)' });
      return;
    }
    const actual = await cargarPedido(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (actual.estado_pago_92 === 'Anulado') {
      res.status(400).json({ success: false, error: 'Pedido anulado' });
      return;
    }
    const fechaPago = estado === 'Pendiente' ? null : req.body.fecha_pago_92 || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `UPDATE tbl_92_pedido_cabecera
       SET estado_pago_92 = $2, fecha_pago_92 = $3
       WHERE id_pedido_92 = $1
       RETURNING id_pedido_92`,
      [req.params.id, estado, fechaPago]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    res.json({ success: true, data: await cargarPedido(req.params.id), message: `Pago: ${estado}` });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al registrar el pago',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const anularPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarPedido(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (actual.estado_recepcion_92 === 'Cerrada' || actual.estado_recepcion_92 === 'Recibido') {
      res.status(400).json({ success: false, error: 'Pedido cerrado: no se anula' });
      return;
    }
    const recibida = (actual.detalles as Array<{ cantidad_recibida_91: number }>).some(
      (d) => num(d.cantidad_recibida_91) > 0
    );
    if (recibida) {
      res.status(400).json({ success: false, error: 'Ya hay mercadería recibida: no se anula' });
      return;
    }
    await pool.query(
      `UPDATE tbl_92_pedido_cabecera
       SET estado_pago_92 = 'Anulado', estado_recepcion_92 = 'Anulado'
       WHERE id_pedido_92 = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: await cargarPedido(req.params.id), message: 'Pedido anulado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al anular el pedido',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const marcarNoRetirado = async (req: Request, res: Response): Promise<void> => {
  try {
    const actual = await cargarPedido(req.params.id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    const recibida = (actual.detalles as Array<{ cantidad_recibida_91: number }>).some(
      (d) => num(d.cantidad_recibida_91) > 0
    );
    if (recibida) {
      res.status(400).json({ success: false, error: 'Ya hay recepción: no aplica No retirado' });
      return;
    }
    if (cicloCerrado(actual.estado_recepcion_92, actual.estado_pago_92)) {
      res.status(400).json({ success: false, error: 'Pedido cerrado' });
      return;
    }
    await pool.query(
      `UPDATE tbl_92_pedido_cabecera SET estado_recepcion_92 = 'No retirado' WHERE id_pedido_92 = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: await cargarPedido(req.params.id), message: 'Marcado como no retirado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al marcar no retirado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

type LineaPedido = {
  id_detalle_91: number;
  id_pedido_91: number;
  cod_insumo_91?: number | null;
  descripcion_libre_91?: string | null;
  descripcion_89?: string | null;
  id_proveedor_91?: number | null;
  cantidad_solicitada_91: number;
  cantidad_recibida_91?: number;
  precio_unitario_91?: number | null;
  observaciones_det_91?: string | null;
};

async function buscarPedidoConsolidado(
  client: PoolClient,
  idOrigen: number,
  idProveedor: number
): Promise<{ id_pedido_92: number; numero_orden_92: string } | null> {
  const r = await client.query(
    `SELECT id_pedido_92, numero_orden_92
     FROM tbl_92_pedido_cabecera
     WHERE id_pedido_92 <> $1
       AND id_proveedor_92 = $2
       AND estado_pago_92 <> 'Anulado'
       AND estado_recepcion_92 IN ('Pendiente', 'Parcial', 'No retirado')
     ORDER BY
       CASE WHEN estado_recepcion_92 = 'Pendiente' THEN 0 ELSE 1 END,
       fecha_pedido_92 DESC,
       id_pedido_92 DESC
     LIMIT 1`,
    [idOrigen, idProveedor]
  );
  return (r.rowCount ?? 0) > 0 ? r.rows[0] : null;
}

async function crearPedidoConsolidado(
  client: PoolClient,
  origen: { id_pedido_92: number; numero_orden_92?: string | null; id_proveedor_92: number; id_responsable_92: number },
  user: string
): Promise<{ id_pedido_92: number; numero_orden_92: string }> {
  const cab = await client.query(
    `INSERT INTO tbl_92_pedido_cabecera (
       id_proveedor_92, id_responsable_92, fecha_pedido_92, observaciones_cab_92, usuario_creacion_92
     ) VALUES ($1, $2, CURRENT_DATE, $3, $4)
     RETURNING id_pedido_92`,
    [
      origen.id_proveedor_92,
      origen.id_responsable_92,
      `DIA SIGUIENTE — PENDIENTES DE ${origen.numero_orden_92 || `PED-${String(origen.id_pedido_92).padStart(6, '0')}`}`,
      user,
    ]
  );
  const id = cab.rows[0].id_pedido_92 as number;
  const numero = `PED-${String(id).padStart(6, '0')}`;
  await client.query(
    `UPDATE tbl_92_pedido_cabecera SET numero_orden_92 = $2 WHERE id_pedido_92 = $1`,
    [id, numero]
  );
  return { id_pedido_92: id, numero_orden_92: numero };
}

/**
 * Cierra una línea: lo que llegó se recibe; el resto pasa a mañana o se da de baja.
 * El PDF no cambia: cantidad_solicitada_91 sigue siendo lo pedido ese día.
 */
export const cerrarLineaPedido = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idPedido = num(req.params.id);
    const idDetalle = num(req.body.id_detalle_91);
    const llegada = Math.max(0, Math.round(num(req.body.cantidad_llegada)));
    const resto = String(req.body.resto || '').trim().toLowerCase();
    const idResp = num(req.body.id_responsable_recibe_93);
    if (!idPedido || !idDetalle) {
      res.status(400).json({ success: false, error: 'Pedido y línea requeridos' });
      return;
    }
    if (resto && resto !== 'manana' && resto !== 'ya_no') {
      res.status(400).json({ success: false, error: 'El resto es mañana o ya no' });
      return;
    }
    const data = await cargarPedido(idPedido);
    if (!data) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (cicloCerrado(data.estado_recepcion_92, data.estado_pago_92)) {
      res.status(400).json({ success: false, error: 'Este pedido ya está cerrado' });
      return;
    }

    await client.query('BEGIN');
    await client.query(
      `SELECT id_pedido_92 FROM tbl_92_pedido_cabecera WHERE id_pedido_92 = $1 FOR UPDATE`,
      [idPedido]
    );
    const det = await client.query(
      `SELECT id_detalle_91, cod_insumo_91, descripcion_libre_91, id_proveedor_91,
              cantidad_solicitada_91, cantidad_recibida_91, cantidad_pasada_91, cantidad_baja_91,
              precio_unitario_91, observaciones_det_91
       FROM tbl_91_pedido_detalle
       WHERE id_detalle_91 = $1 AND id_pedido_91 = $2
       FOR UPDATE`,
      [idDetalle, idPedido]
    );
    if ((det.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Línea no encontrada en este pedido' });
      return;
    }
    const row = det.rows[0] as LineaPedido;
    const pend = pendienteOperativo(row);
    if (pend < 1) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Esta línea ya está cerrada' });
      return;
    }
    if (llegada > pend) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: `Solo quedan ${pend} pendientes` });
      return;
    }
    const falta = pend - llegada;
    if (falta > 0 && resto !== 'manana' && resto !== 'ya_no') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Indique si el resto pasa a mañana o ya no se pide por el sistema',
      });
      return;
    }
    if (llegada > 0) {
      if (!idResp || !(await responsableExiste(idResp))) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: 'Indique quién recibe lo que llegó' });
        return;
      }
      await client.query(
        `INSERT INTO tbl_93_recepcion_parcial (
           id_detalle_93, cantidad_recibida_93, id_responsable_recibe_93, observaciones_rec_93
         ) VALUES ($1, $2, $3, $4)`,
        [idDetalle, llegada, idResp, 'CIERRE DE LÍNEA']
      );
      await client.query(
        `UPDATE tbl_91_pedido_detalle
         SET cantidad_recibida_91 = cantidad_recibida_91 + $2
         WHERE id_detalle_91 = $1`,
        [idDetalle, llegada]
      );
    }

    let destino: { id_pedido_92: number; numero_orden_92: string } | null = null;
    if (falta > 0 && resto === 'manana') {
      const idProv = num(row.id_proveedor_91) || num(data.id_proveedor_92);
      destino = await buscarPedidoConsolidado(client, idPedido, idProv);
      if (!destino) {
        destino = await crearPedidoConsolidado(
          client,
          {
            id_pedido_92: idPedido,
            numero_orden_92: data.numero_orden_92,
            id_proveedor_92: idProv,
            id_responsable_92: num(data.id_responsable_92),
          },
          usuario(req)
        );
      }
      const numeroOrigen = String(data.numero_orden_92 || `PED-${String(idPedido).padStart(6, '0')}`);
      const destLineas = await client.query(
        `SELECT id_detalle_91, cod_insumo_91, descripcion_libre_91, id_proveedor_91,
                cantidad_solicitada_91, cantidad_recibida_91
         FROM tbl_91_pedido_detalle
         WHERE id_pedido_91 = $1
           AND COALESCE(cantidad_recibida_91, 0) = 0
           AND COALESCE(cantidad_pasada_91, 0) = 0
           AND COALESCE(cantidad_baja_91, 0) = 0`,
        [destino.id_pedido_92]
      );
      const clave = claveConsolidar(row);
      const ya = (destLineas.rows as LineaPedido[]).find((d) => claveConsolidar(d) === clave);
      if (ya) {
        await client.query(
          `UPDATE tbl_91_pedido_detalle
           SET cantidad_solicitada_91 = cantidad_solicitada_91 + $2
           WHERE id_detalle_91 = $1 AND id_pedido_91 = $3`,
          [ya.id_detalle_91, falta, destino.id_pedido_92]
        );
      } else {
        await client.query(
          `INSERT INTO tbl_91_pedido_detalle (
             id_pedido_91, cod_insumo_91, descripcion_libre_91, id_proveedor_91,
             cantidad_solicitada_91, precio_unitario_91, observaciones_det_91, id_detalle_origen_91
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            destino.id_pedido_92,
            row.cod_insumo_91 || null,
            row.descripcion_libre_91 || null,
            row.id_proveedor_91 || idProv,
            falta,
            row.precio_unitario_91 ?? null,
            upper(`DESDE ${numeroOrigen}${row.observaciones_det_91 ? ` — ${row.observaciones_det_91}` : ''}`),
            idDetalle,
          ]
        );
      }
      await client.query(
        `UPDATE tbl_91_pedido_detalle
         SET cantidad_pasada_91 = COALESCE(cantidad_pasada_91, 0) + $2
         WHERE id_detalle_91 = $1`,
        [idDetalle, falta]
      );
    }
    if (falta > 0 && resto === 'ya_no') {
      await client.query(
        `UPDATE tbl_91_pedido_detalle
         SET cantidad_baja_91 = COALESCE(cantidad_baja_91, 0) + $2
         WHERE id_detalle_91 = $1`,
        [idDetalle, falta]
      );
    }

    await recalcularRecepcion(client, idPedido);
    await client.query('COMMIT');
    const actualizado = await cargarPedido(idPedido);
    const partes: string[] = [];
    if (llegada > 0) partes.push(`${llegada} recibidos`);
    if (falta > 0 && resto === 'manana') partes.push(`${falta} para mañana en ${destino?.numero_orden_92 || 'el pedido siguiente'}`);
    if (falta > 0 && resto === 'ya_no') partes.push(`${falta} dados de baja`);
    res.json({
      success: true,
      data: actualizado,
      message: partes.length > 0 ? `Línea cerrada: ${partes.join('. ')}` : 'Línea cerrada',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al cerrar la línea',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

type DetallePdf = {
  codigo_89?: string | null;
  descripcion_89?: string | null;
  proveedor_89?: string | null;
  cantidad_solicitada_91: number;
  precio_unitario_91?: number | null;
};

function proveedorDeLinea(d: DetallePdf, fallback: string): string {
  const n = String(d.proveedor_89 || '').trim().toUpperCase();
  return n || fallback || 'SIN PROVEEDOR';
}

function agruparRequerimientos(detalles: DetallePdf[], fallback: string) {
  const map = new Map<string, DetallePdf[]>();
  for (const d of detalles) {
    const key = proveedorDeLinea(d, fallback);
    const arr = map.get(key) || [];
    arr.push(d);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([proveedor, lineas]) => {
      const ordenadas = [...lineas].sort(
        (a, b) => cantidadEntera(b.cantidad_solicitada_91) - cantidadEntera(a.cantidad_solicitada_91)
      );
      const totalQty = ordenadas.reduce((s, l) => s + cantidadEntera(l.cantidad_solicitada_91), 0);
      return { proveedor, lineas: ordenadas, totalQty };
    })
    .sort((a, b) => b.totalQty - a.totalQty || a.proveedor.localeCompare(b.proveedor, 'es'));
}

/** PDF del pedido: requerimientos agrupados por proveedor, cantidad de mayor a menor. */
export const generarPdfPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await cargarPedido(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    const detalles = (data.detalles || []) as DetallePdf[];
    if (detalles.length === 0) {
      res.status(400).json({ success: false, error: 'El pedido no tiene líneas para exportar' });
      return;
    }
    const fallback = String(data.proveedor_nombre || '').trim().toUpperCase();
    const grupos = agruparRequerimientos(detalles, fallback);
    const numero = String(data.numero_orden_92 || `PED-${String(data.id_pedido_92).padStart(6, '0')}`);
    const cruda = data.fecha_pedido_92;
    const fecha =
      cruda instanceof Date && !Number.isNaN(cruda.getTime())
        ? cruda.toISOString().slice(0, 10)
        : String(cruda || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
          || String(cruda || '').slice(0, 10);
    const totalQty = grupos.reduce((s, g) => s + g.totalQty, 0);

    const cell = (text: string | number, extra: Record<string, unknown> = {}) => ({
      text: String(text ?? ''),
      fontSize: 8,
      ...extra,
    });
    const headerCell = (text: string) =>
      cell(text, { bold: true, color: '#1e3a5f', fillColor: '#eef2f6' });

    const content: unknown[] = [
      { text: 'MANTEC ERP', fontSize: 9, color: '#64748b', margin: [0, 0, 0, 2] },
      { text: `Requerimientos por proveedor — ${numero}`, fontSize: 14, bold: true, color: '#1e3a5f' },
      {
        text: `Fecha ${fecha}  ·  Pedido a ${fallback || '—'}  ·  ${data.responsable_nombre || '—'}  ·  Pago ${data.estado_pago_92}  ·  Recepción ${data.estado_recepcion_92}`,
        fontSize: 8,
        color: '#64748b',
        margin: [0, 4, 0, 2],
      },
      {
        text: `${detalles.length} ítems  ·  ${totalQty} unidades  ·  ${grupos.length} proveedores`,
        fontSize: 8,
        color: '#64748b',
        margin: [0, 0, 0, data.observaciones_cab_92 ? 2 : 10],
      },
    ];
    if (data.observaciones_cab_92) {
      content.push({
        text: `Obs.: ${data.observaciones_cab_92}`,
        fontSize: 8,
        italics: true,
        margin: [0, 0, 0, 10],
      });
    }

    for (const g of grupos) {
      content.push({
        table: {
          widths: ['*'],
          body: [[
            {
              text: `${g.proveedor}  —  ${g.lineas.length} ítems  —  ${g.totalQty} un.`,
              bold: true,
              color: '#fff',
              fillColor: '#1e3a5f',
              fontSize: 10,
              margin: [6, 4, 6, 4],
            },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 8, 0, 0],
      });
      const body = [
        [headerCell('#'), headerCell('Código'), headerCell('Descripción'), headerCell('Cant.'), headerCell('Precio')],
        ...g.lineas.map((l, i) => [
          cell(i + 1, { alignment: 'center' }),
          cell(l.codigo_89 || 'SIN CÓDIGO'),
          cell(l.descripcion_89 || ''),
          cell(cantidadEntera(l.cantidad_solicitada_91), { alignment: 'right', bold: true }),
          cell(l.precio_unitario_91 == null ? '—' : num(l.precio_unitario_91).toFixed(2), { alignment: 'right' }),
        ]),
      ];
      content.push({
        table: { headerRows: 1, widths: [22, 90, '*', 40, 50], body },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => '#c5cdd6',
          vLineColor: () => '#c5cdd6',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 4],
      });
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
    const docDefinition: PdfDocumentDefinition = {
      pageSize: 'LETTER',
      pageMargins: [40, 36, 40, 40],
      content,
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Uso interno · Agrupado por proveedor (cantidad mayor a menor)', fontSize: 7, color: '#94a3b8', margin: [40, 0, 0, 0] },
          { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 7, color: '#94a3b8', margin: [0, 0, 40, 0] },
        ],
      }),
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const filename = `${numero}_requerimientos.pdf`;
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
      error: 'Error al generar el PDF del pedido',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

type DetallePedido = DetallePdf & { id_detalle_91: number };

function telefonoWhatsAppE164(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('56') && digits.length >= 11) return digits.slice(0, 11);
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

async function catalogoProveedorPorNombre(nombre: string) {
  const exact = await pool.query(
    `SELECT id_proveedor_90, razon_social_90, telefono_90
     FROM tbl_90_proveedor
     WHERE UPPER(TRIM(BOTH FROM razon_social_90)) = $1
     LIMIT 1`,
    [nombre]
  );
  if ((exact.rowCount ?? 0) > 0) return exact.rows[0];
  const hits = await pool.query(
    `SELECT id_proveedor_90, razon_social_90, telefono_90
     FROM tbl_90_proveedor
     WHERE UPPER(TRIM(BOTH FROM razon_social_90)) LIKE $1
        OR $2 LIKE '%' || UPPER(TRIM(BOTH FROM razon_social_90)) || '%'`,
    [`%${nombre}%`, nombre]
  );
  return (hits.rowCount ?? 0) === 1 ? hits.rows[0] : null;
}

/** Marca las líneas pendientes de un proveedor y devuelve el texto para WhatsApp. */
export const registrarEnvioWhatsApp = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const idPedido = num(req.params.id);
    const proveedor = upper(req.body.proveedor);
    if (!idPedido || !proveedor) {
      res.status(400).json({ success: false, error: 'Pedido y proveedor son requeridos' });
      return;
    }
    const data = await cargarPedido(idPedido);
    if (!data) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (cicloCerrado(data.estado_recepcion_92, data.estado_pago_92)) {
      res.status(400).json({ success: false, error: 'Pedido cerrado: no se envía WhatsApp' });
      return;
    }
    const fallback = String(data.proveedor_nombre || '').trim().toUpperCase();
    const delPedido = (data.detalles || []) as DetallePedido[];
    const delGrupo = delPedido.filter((d) => proveedorDeLinea(d, fallback) === proveedor);
    if (delGrupo.length === 0) {
      res.status(400).json({ success: false, error: `No hay líneas para ${proveedor}` });
      return;
    }
    const ya = await pool.query(
      `SELECT d.id_detalle_99
       FROM tbl_99_pedido_envio_wa_det d
       JOIN tbl_98_pedido_envio_wa e ON e.id_envio_98 = d.id_envio_99
       WHERE e.id_pedido_98 = $1`,
      [idPedido]
    );
    const enviados = new Set(ya.rows.map((r: { id_detalle_99: number }) => Number(r.id_detalle_99)));
    const pendientes = delGrupo.filter((d) => !enviados.has(Number(d.id_detalle_91)));
    if (pendientes.length === 0) {
      res.status(400).json({ success: false, error: `Nada pendiente para ${proveedor}. Lo de las 09:30 no se vuelve a mandar.` });
      return;
    }
    const catalogo = await catalogoProveedorPorNombre(proveedor);
    const e164 = telefonoWhatsAppE164(catalogo?.telefono_90);
    if (!e164) {
      res.status(400).json({
        success: false,
        error: `No hay teléfono para ${proveedor}. Cárgalo en Pedidos → Proveedores.`,
      });
      return;
    }
    const numero = String(data.numero_orden_92 || `PED-${String(idPedido).padStart(6, '0')}`);
    const fecha =
      data.fecha_pedido_92 instanceof Date && !Number.isNaN(data.fecha_pedido_92.getTime())
        ? data.fecha_pedido_92.toISOString().slice(0, 10)
        : String(data.fecha_pedido_92 || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
          || String(data.fecha_pedido_92 || '').slice(0, 10);
    const totalQty = pendientes.reduce((s, l) => s + cantidadEntera(l.cantidad_solicitada_91), 0);
    const lineasTxt = pendientes.map(
      (l, i) =>
        `${i + 1}. ${l.descripcion_89 || ''} (${l.codigo_89 || 'SIN CÓDIGO'}) — ${cantidadEntera(l.cantidad_solicitada_91)} un.`
    );
    const texto = [
      'MANTEC ERP',
      `Pedido ${numero} — ${fecha}`,
      `Requerimientos NUEVOS para ${proveedor}`,
      '(no incluye lo ya enviado)',
      '',
      ...lineasTxt,
      '',
      `Total este envío: ${pendientes.length} ítems, ${totalQty} unidades`,
    ].join('\n');

    await client.query('BEGIN');
    const cab = await client.query(
      `INSERT INTO tbl_98_pedido_envio_wa (
         id_pedido_98, proveedor_98, id_proveedor_98, telefono_98, texto_98, usuario_98
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [idPedido, proveedor, catalogo?.id_proveedor_90 || null, e164, texto, usuario(req)]
    );
    const idEnvio = cab.rows[0].id_envio_98 as number;
    for (const ln of pendientes) {
      await client.query(
        `INSERT INTO tbl_99_pedido_envio_wa_det (id_envio_99, id_detalle_99) VALUES ($1, $2)`,
        [idEnvio, ln.id_detalle_91]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: {
        ...cab.rows[0],
        telefono_e164: e164,
        texto,
        pendientes: pendientes.length,
        pedido: await cargarPedido(idPedido),
      },
      message: `Lote ${pendientes.length} ítems a ${proveedor}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al registrar el envío WhatsApp',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
  }
};

export const deshacerEnvioWhatsApp = async (req: Request, res: Response): Promise<void> => {
  try {
    const idPedido = num(req.params.id);
    const idEnvio = num(req.params.idEnvio);
    const found = await pool.query(
      `SELECT id_envio_98 FROM tbl_98_pedido_envio_wa
       WHERE id_envio_98 = $1 AND id_pedido_98 = $2`,
      [idEnvio, idPedido]
    );
    if ((found.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Envío no encontrado en este pedido' });
      return;
    }
    await pool.query('DELETE FROM tbl_98_pedido_envio_wa WHERE id_envio_98 = $1', [idEnvio]);
    res.json({
      success: true,
      data: await cargarPedido(idPedido),
      message: 'Envío deshecho: esas líneas vuelven a pendiente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al deshacer el envío',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
