import { Request, Response } from 'express';
import { pool } from '../db.js';

const TABLA = 'tbl_90_proveedor';
const TIPOS = new Set(['Despacha', 'No despacha', 'Mixto']);

function norm(value: unknown, max: number): string | null {
  if (value == null) return null;
  const t = String(value).trim().toUpperCase();
  if (!t) return null;
  return t.slice(0, max);
}

export const getAllProveedoresPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivos = String(req.query.activos || '') === '1';
    const result = await pool.query(
      `SELECT * FROM ${TABLA}
       ${soloActivos ? 'WHERE activo_90 = true' : ''}
       ORDER BY razon_social_90 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? 0 });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getProveedorPedidoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM ${TABLA} WHERE id_proveedor_90 = $1`, [req.params.id]);
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createProveedorPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const razon = norm(req.body.razon_social_90, 150);
    if (!razon) {
      res.status(400).json({ success: false, error: 'La razón social es requerida' });
      return;
    }
    const tipo = String(req.body.tipo_despacho_90 || 'Despacha').trim();
    if (!TIPOS.has(tipo)) {
      res.status(400).json({ success: false, error: 'Tipo de despacho inválido' });
      return;
    }
    const ruc = norm(req.body.ruc_90, 20);
    const result = await pool.query(
      `INSERT INTO ${TABLA} (razon_social_90, ruc_90, tipo_despacho_90, contacto_90, telefono_90, activo_90)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        razon,
        ruc,
        tipo,
        norm(req.body.contacto_90, 100),
        norm(req.body.telefono_90, 20),
        req.body.activo_90 !== false,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Proveedor creado' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /unique/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Ya existe un proveedor con ese RUC' : 'Error al crear el proveedor',
      message: msg,
    });
  }
};

export const updateProveedorPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const razon = norm(req.body.razon_social_90, 150);
    if (!razon) {
      res.status(400).json({ success: false, error: 'La razón social es requerida' });
      return;
    }
    const tipo = String(req.body.tipo_despacho_90 || 'Despacha').trim();
    if (!TIPOS.has(tipo)) {
      res.status(400).json({ success: false, error: 'Tipo de despacho inválido' });
      return;
    }
    const result = await pool.query(
      `UPDATE ${TABLA}
       SET razon_social_90 = $1,
           ruc_90 = $2,
           tipo_despacho_90 = $3,
           contacto_90 = $4,
           telefono_90 = $5,
           activo_90 = $6
       WHERE id_proveedor_90 = $7
       RETURNING *`,
      [
        razon,
        norm(req.body.ruc_90, 20),
        tipo,
        norm(req.body.contacto_90, 100),
        norm(req.body.telefono_90, 20),
        req.body.activo_90 !== false,
        req.params.id,
      ]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Proveedor actualizado' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const dup = /unique/i.test(msg);
    res.status(dup ? 400 : 500).json({
      success: false,
      error: dup ? 'Ya existe un proveedor con ese RUC' : 'Error al actualizar el proveedor',
      message: msg,
    });
  }
};

export const deleteProveedorPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const used = await pool.query(
      'SELECT id_pedido_92 FROM tbl_92_pedido_cabecera WHERE id_proveedor_92 = $1 LIMIT 1',
      [req.params.id]
    );
    if ((used.rowCount ?? 0) > 0) {
      const result = await pool.query(
        `UPDATE ${TABLA} SET activo_90 = false WHERE id_proveedor_90 = $1 RETURNING *`,
        [req.params.id]
      );
      if ((result.rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
        return;
      }
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Tiene pedidos: se inactivó en lugar de eliminar',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE id_proveedor_90 = $1 RETURNING id_proveedor_90`,
      [req.params.id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
