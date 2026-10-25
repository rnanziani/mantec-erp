import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../db.js';

const PAGOS = new Set(['Pendiente', 'Pagado', 'Parcial', 'Anulado']);

type LineaIn = {
  cod_insumo_91: number | null;
  descripcion_libre_91: string | null;
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
         e.proveedor_89
  FROM tbl_91_pedido_detalle d
  LEFT JOIN tbl_89_codigo_etiqueta e ON d.cod_insumo_91 = e.idcodigo_89
  WHERE d.id_pedido_91 = $1
  ORDER BY d.id_detalle_91
`;

async function cargarPedido(id: string | number) {
  const cab = await pool.query(`${SELECT_CAB} WHERE c.id_pedido_92 = $1`, [id]);
  if ((cab.rowCount ?? 0) === 0) return null;
  const det = await pool.query(SELECT_DET, [id]);
  return { ...cab.rows[0], detalles: det.rows };
}

async function recalcularRecepcion(client: PoolClient, idPedido: number): Promise<void> {
  const cab = await client.query(
    `SELECT estado_recepcion_92 FROM tbl_92_pedido_cabecera WHERE id_pedido_92 = $1`,
    [idPedido]
  );
  const actual = String(cab.rows[0]?.estado_recepcion_92 || 'Pendiente');
  if (actual === 'Anulado') return;
  const r = await client.query(
    `SELECT
       COALESCE(SUM(cantidad_solicitada_91), 0) AS sol,
       COALESCE(SUM(cantidad_recibida_91), 0) AS rec
     FROM tbl_91_pedido_detalle
     WHERE id_pedido_91 = $1`,
    [idPedido]
  );
  const sol = num(r.rows[0]?.sol);
  const rec = num(r.rows[0]?.rec);
  let next = 'Pendiente';
  if (rec <= 0) next = actual === 'No retirado' ? 'No retirado' : 'Pendiente';
  else if (rec < sol) next = 'Parcial';
  else next = 'Recibido';
  await client.query(
    `UPDATE tbl_92_pedido_cabecera
     SET estado_recepcion_92 = $2,
         fecha_retiro_92 = CASE WHEN $2 = 'Recibido' THEN COALESCE(fecha_retiro_92, CURRENT_DATE) ELSE fecha_retiro_92 END
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
    lineas.push({
      cod_insumo_91: sku || null,
      descripcion_libre_91: sku ? null : (desc ? desc.slice(0, 200) : null),
      cantidad_solicitada_91: qty,
      precio_unitario_91: row.precio_unitario_91 == null || row.precio_unitario_91 === '' ? null : num(row.precio_unitario_91),
      observaciones_det_91: upper(row.observaciones_det_91),
    });
  }
  return lineas;
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
    for (const ln of lineas) {
      if (ln.cod_insumo_91 && !(await skuExiste(ln.cod_insumo_91))) {
        res.status(400).json({ success: false, error: `SKU ${ln.cod_insumo_91} no está activo en etiquetas` });
        return;
      }
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
           id_pedido_91, cod_insumo_91, descripcion_libre_91, cantidad_solicitada_91, precio_unitario_91, observaciones_det_91
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [idPedido, ln.cod_insumo_91, ln.descripcion_libre_91, ln.cantidad_solicitada_91, ln.precio_unitario_91, ln.observaciones_det_91]
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
    if (actual.estado_pago_92 === 'Anulado' || actual.estado_recepcion_92 === 'Anulado') {
      res.status(400).json({ success: false, error: 'No se puede editar un pedido anulado' });
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
    for (const ln of lineas) {
      if (ln.cod_insumo_91 && !(await skuExiste(ln.cod_insumo_91))) {
        res.status(400).json({ success: false, error: `SKU ${ln.cod_insumo_91} no está activo en etiquetas` });
        return;
      }
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
    await client.query('DELETE FROM tbl_91_pedido_detalle WHERE id_pedido_91 = $1', [id]);
    for (const ln of lineas) {
      await client.query(
        `INSERT INTO tbl_91_pedido_detalle (
           id_pedido_91, cod_insumo_91, descripcion_libre_91, cantidad_solicitada_91, precio_unitario_91, observaciones_det_91
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, ln.cod_insumo_91, ln.descripcion_libre_91, ln.cantidad_solicitada_91, ln.precio_unitario_91, ln.observaciones_det_91]
      );
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
    if (row.estado_recepcion_92 === 'Anulado' || row.estado_pago_92 === 'Anulado') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Pedido anulado' });
      return;
    }
    const pendiente = num(row.cantidad_solicitada_91) - num(row.cantidad_recibida_91);
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
    if (actual.estado_recepcion_92 === 'Anulado') {
      res.status(400).json({ success: false, error: 'Pedido anulado' });
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
