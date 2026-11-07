/**
 * API del bot de cotizaciones. No es la pantalla de pedidos.
 * Solo escribe precio_unitario_91 y, cuando el pedido completo está pagado,
 * estado_pago_92 = Pagado. No toca número de orden, observaciones ni recepción.
 */
import { Request, Response } from 'express';
import { pool } from '../db.js';
import { errorDetails } from '../utils/safeError.js';

type LineaPrecio = { id_detalle_91: number; precio: number };

function idPedido(req: Request): number {
  const n = Number(req.params.id);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function fechaIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const texto = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

async function leerPedido(id: number) {
  const cab = await pool.query(
    `SELECT id_pedido_92, numero_orden_92, estado_pago_92, fecha_pago_92
     FROM tbl_92_pedido_cabecera
     WHERE id_pedido_92 = $1`,
    [id]
  );
  if ((cab.rowCount ?? 0) === 0) return null;
  const lineas = await pool.query(
    `SELECT d.id_detalle_91,
            d.id_proveedor_91,
            d.cod_insumo_91,
            d.descripcion_libre_91,
            d.precio_unitario_91,
            e.codigo_89,
            e.descripcion_89
     FROM tbl_91_pedido_detalle d
     LEFT JOIN tbl_89_codigo_etiqueta e ON e.idcodigo_89 = d.cod_insumo_91
     WHERE d.id_pedido_91 = $1
     ORDER BY d.id_detalle_91`,
    [id]
  );
  const row = cab.rows[0];
  return {
    id_pedido_92: row.id_pedido_92,
    numero_orden_92: row.numero_orden_92,
    estado_pago_92: row.estado_pago_92,
    fecha_pago_92: fechaIso(row.fecha_pago_92),
    lineas: lineas.rows,
  };
}

function lineasPrecio(body: unknown): LineaPrecio[] | null {
  const lineas = (body as { lineas?: unknown })?.lineas;
  if (!Array.isArray(lineas) || lineas.length === 0) return null;
  const salida: LineaPrecio[] = [];
  for (const linea of lineas) {
    const id = Number((linea as { id_detalle_91?: unknown }).id_detalle_91);
    const precio = Number((linea as { precio?: unknown }).precio);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!Number.isFinite(precio) || precio < 0 || precio > 99999999.9999) return null;
    salida.push({ id_detalle_91: id, precio });
  }
  return salida;
}

export const getPedidoBot = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = idPedido(req);
    if (!id) {
      res.status(400).json({ success: false, error: 'Id de pedido inválido' });
      return;
    }
    const data = await leerPedido(id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al leer el pedido',
      message: errorDetails(error),
    });
  }
};

export const patchPreciosBot = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const id = idPedido(req);
    const idProveedor = Number(req.body?.id_proveedor_90);
    const lineas = lineasPrecio(req.body);
    if (!id || !Number.isInteger(idProveedor) || idProveedor <= 0 || !lineas) {
      res.status(400).json({
        success: false,
        error: 'Se requiere id_proveedor_90 y lineas con id_detalle_91 y precio neto',
      });
      return;
    }
    const actual = await leerPedido(id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (actual.estado_pago_92 === 'Anulado') {
      res.status(400).json({ success: false, error: 'Pedido anulado' });
      return;
    }
    await client.query('BEGIN');
    for (const linea of lineas) {
      const upd = await client.query(
        `UPDATE tbl_91_pedido_detalle
         SET precio_unitario_91 = $4
         WHERE id_detalle_91 = $1
           AND id_pedido_91 = $2
           AND id_proveedor_91 = $3`,
        [linea.id_detalle_91, id, idProveedor, linea.precio]
      );
      if ((upd.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          error: 'La línea no pertenece a este pedido o a este proveedor',
          id_detalle_91: linea.id_detalle_91,
        });
        return;
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, data: await leerPedido(id) });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al guardar precios',
      message: errorDetails(error),
    });
  } finally {
    client.release();
  }
};

export const patchPagoBot = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = idPedido(req);
    const estado = String(req.body?.estado || '').trim();
    const fecha = fechaIso(req.body?.fecha_pago);
    if (!id || estado !== 'Pagado' || !fecha) {
      res.status(400).json({
        success: false,
        error: 'Solo se acepta estado Pagado y fecha_pago AAAA-MM-DD',
      });
      return;
    }
    const actual = await leerPedido(id);
    if (!actual) {
      res.status(404).json({ success: false, error: 'Pedido no encontrado' });
      return;
    }
    if (actual.estado_pago_92 === 'Anulado') {
      res.status(400).json({ success: false, error: 'Pedido anulado' });
      return;
    }
    if (actual.estado_pago_92 === 'Pagado') {
      if (actual.fecha_pago_92 === fecha) {
        res.json({ success: true, data: actual });
        return;
      }
      res.status(409).json({
        success: false,
        error: 'El pedido ya está Pagado con otra fecha',
        fecha_pago_92: actual.fecha_pago_92,
      });
      return;
    }
    await pool.query(
      `UPDATE tbl_92_pedido_cabecera
       SET estado_pago_92 = 'Pagado', fecha_pago_92 = $2
       WHERE id_pedido_92 = $1
         AND estado_pago_92 <> 'Anulado'`,
      [id, fecha]
    );
    res.json({ success: true, data: await leerPedido(id) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al registrar el pago',
      message: errorDetails(error),
    });
  }
};
