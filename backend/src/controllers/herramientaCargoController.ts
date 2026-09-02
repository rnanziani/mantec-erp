import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateHerramientaCargoDTO,
  HerramientaCargo,
  UpdateHerramientaCargoDTO,
} from '../types.js';

const TABLA = 'tbl_66_herramienta_cargo';
const ESTADOS = new Set(['DISPONIBLE', 'A_CARGO', 'EN_MANTENCION', 'PERDIDA', 'DANADA', 'DE_BAJA']);

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

export const getAllHerramientasCargo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<HerramientaCargo>(
      `SELECT h.*, m.marca_insumo_37 AS marca_insumo_nombre
       FROM ${TABLA} h
       LEFT JOIN tbl_37_marca_insumo m ON h.idmarca_insumo_66 = m.id_marca_insumo_37
       ORDER BY h.codigo_66 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener herramientas a cargo',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getHerramientaCargoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<HerramientaCargo>(
      `SELECT h.*, m.marca_insumo_37 AS marca_insumo_nombre
       FROM ${TABLA} h
       LEFT JOIN tbl_37_marca_insumo m ON h.idmarca_insumo_66 = m.id_marca_insumo_37
       WHERE h.idherramienta_66 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la herramienta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createHerramientaCargo = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateHerramientaCargoDTO = req.body;
    const codigo = normalizeText(body.codigo_66);
    const nombre = normalizeText(body.nombre_66);
    if (!codigo || !nombre) {
      res.status(400).json({ success: false, error: 'Código y nombre son requeridos' });
      return;
    }
    const stock = body.stock_66 != null ? Number(body.stock_66) : 1;
    const disp =
      body.stock_disponible_66 != null ? Number(body.stock_disponible_66) : stock;
    if (stock < 0 || disp < 0 || disp > stock) {
      res.status(400).json({ success: false, error: 'Stock inválido' });
      return;
    }
    const estado = String(body.estado_66 || 'DISPONIBLE').toUpperCase();
    if (!ESTADOS.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado inválido' });
      return;
    }
    const dup = await pool.query(`SELECT 1 FROM ${TABLA} WHERE codigo_66 = $1`, [codigo]);
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una herramienta con ese código' });
      return;
    }
    const result = await pool.query<HerramientaCargo>(
      `INSERT INTO ${TABLA} (
        codigo_66, nombre_66, idmarca_insumo_66, modelo_66, serie_66, ubicacion_66,
        valor_66, stock_66, stock_disponible_66, foto_66, estado_66, activo_66
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        codigo,
        nombre,
        body.idmarca_insumo_66 || null,
        normalizeText(body.modelo_66),
        normalizeText(body.serie_66),
        normalizeText(body.ubicacion_66),
        Number(body.valor_66 || 0),
        stock,
        disp,
        body.foto_66 || null,
        estado,
        body.activo_66 !== undefined ? body.activo_66 : true,
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Herramienta creada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la herramienta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateHerramientaCargo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateHerramientaCargoDTO = req.body;
    const exists = await pool.query(`SELECT idherramienta_66 FROM ${TABLA} WHERE idherramienta_66 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.codigo_66 !== undefined) {
      const codigo = normalizeText(body.codigo_66);
      if (!codigo) {
        res.status(400).json({ success: false, error: 'Código inválido' });
        return;
      }
      const dup = await pool.query(
        `SELECT 1 FROM ${TABLA} WHERE codigo_66 = $1 AND idherramienta_66 <> $2`,
        [codigo, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Código duplicado' });
        return;
      }
      updates.push(`codigo_66 = $${i++}`);
      values.push(codigo);
    }
    if (body.nombre_66 !== undefined) {
      const nombre = normalizeText(body.nombre_66);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'Nombre inválido' });
        return;
      }
      updates.push(`nombre_66 = $${i++}`);
      values.push(nombre);
    }
    if (body.idmarca_insumo_66 !== undefined) {
      updates.push(`idmarca_insumo_66 = $${i++}`);
      values.push(body.idmarca_insumo_66 || null);
    }
    if (body.modelo_66 !== undefined) {
      updates.push(`modelo_66 = $${i++}`);
      values.push(normalizeText(body.modelo_66));
    }
    if (body.serie_66 !== undefined) {
      updates.push(`serie_66 = $${i++}`);
      values.push(normalizeText(body.serie_66));
    }
    if (body.ubicacion_66 !== undefined) {
      updates.push(`ubicacion_66 = $${i++}`);
      values.push(normalizeText(body.ubicacion_66));
    }
    if (body.valor_66 !== undefined) {
      updates.push(`valor_66 = $${i++}`);
      values.push(Number(body.valor_66));
    }
    if (body.stock_66 !== undefined) {
      updates.push(`stock_66 = $${i++}`);
      values.push(Number(body.stock_66));
    }
    if (body.stock_disponible_66 !== undefined) {
      updates.push(`stock_disponible_66 = $${i++}`);
      values.push(Number(body.stock_disponible_66));
    }
    if (body.foto_66 !== undefined) {
      updates.push(`foto_66 = $${i++}`);
      values.push(body.foto_66 || null);
    }
    if (body.estado_66 !== undefined) {
      const estado = String(body.estado_66).toUpperCase();
      if (!ESTADOS.has(estado)) {
        res.status(400).json({ success: false, error: 'Estado inválido' });
        return;
      }
      updates.push(`estado_66 = $${i++}`);
      values.push(estado);
    }
    if (body.activo_66 !== undefined) {
      updates.push(`activo_66 = $${i++}`);
      values.push(body.activo_66);
    }

    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }
    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<HerramientaCargo>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idherramienta_66 = $${i} RETURNING *`,
      values
    );
    res.json({ success: true, data: result.rows[0], message: 'Herramienta actualizada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteHerramientaCargo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enUso = await pool.query(
      `SELECT 1 FROM tbl_68_d_entrega_cargo d
       INNER JOIN tbl_67_m_entrega_cargo m ON m.identrega_67 = d.identrega_68
       WHERE d.idherramienta_68 = $1
         AND UPPER(TRIM(m.estado_67)) IN ('ACTIVA', 'PARCIAL')
         AND d.cantidad_devuelta_68 < d.cantidad_68
       LIMIT 1`,
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE ${TABLA} SET activo_66 = false, actualizado_en = CURRENT_TIMESTAMP WHERE idherramienta_66 = $1`,
        [id]
      );
      res.json({ success: true, message: 'Herramienta en uso: se desactivó' });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idherramienta_66 = $1 RETURNING idherramienta_66`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
      return;
    }
    res.json({ success: true, message: 'Herramienta eliminada' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
