import { Request, Response } from 'express';
import { pool } from '../db.js';
import { CreateProveedorDTO, Proveedor, UpdateProveedorDTO } from '../types.js';
import { formatRut, validateRut } from '../utils/rutValidator.js';

const TABLA = 'tbl_58_proveedor';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

/** RUT opcional: vacío → null; si viene, debe ser válido y queda formateado */
function normalizeRut(value: unknown): { ok: true; rut: string | null } | { ok: false; error: string } {
  if (value == null || String(value).trim() === '') {
    return { ok: true, rut: null };
  }
  const raw = String(value).trim();
  if (!validateRut(raw)) {
    return { ok: false, error: 'RUT inválido' };
  }
  return { ok: true, rut: formatRut(raw) };
}

export const getAllProveedores = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Proveedor>(
      `SELECT idproveedor_58, rut_58, nombre_58, contacto_58, telefono_58, email_58, activo_58, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY nombre_58 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getProveedorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Proveedor>(`SELECT * FROM ${TABLA} WHERE idproveedor_58 = $1`, [id]);
    if (result.rowCount === 0) {
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

export const createProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateProveedorDTO = req.body;
    const nombre = normalizeText(body.nombre_58);
    const rutResult = normalizeRut(body.rut_58);
    if (!nombre) {
      res.status(400).json({ success: false, error: 'El nombre es requerido' });
      return;
    }
    if (!rutResult.ok) {
      res.status(400).json({ success: false, error: rutResult.error });
      return;
    }
    const rut = rutResult.rut;
    if (rut) {
      const dup = await pool.query(`SELECT idproveedor_58 FROM ${TABLA} WHERE rut_58 = $1`, [rut]);
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe un proveedor con ese RUT' });
        return;
      }
    }
    const result = await pool.query<Proveedor>(
      `INSERT INTO ${TABLA} (rut_58, nombre_58, contacto_58, telefono_58, email_58, activo_58)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        rut,
        nombre,
        normalizeText(body.contacto_58),
        normalizeText(body.telefono_58),
        body.email_58 ? String(body.email_58).trim().toLowerCase() : null,
        body.activo_58 !== undefined ? body.activo_58 : true,
      ]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Proveedor creado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateProveedorDTO = req.body;
    const exists = await pool.query(`SELECT idproveedor_58 FROM ${TABLA} WHERE idproveedor_58 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.nombre_58 !== undefined) {
      const nombre = normalizeText(body.nombre_58);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`nombre_58 = $${i++}`);
      values.push(nombre);
    }
    if (body.rut_58 !== undefined) {
      const rutResult = normalizeRut(body.rut_58);
      if (!rutResult.ok) {
        res.status(400).json({ success: false, error: rutResult.error });
        return;
      }
      const rut = rutResult.rut;
      if (rut) {
        const dup = await pool.query(
          `SELECT idproveedor_58 FROM ${TABLA} WHERE rut_58 = $1 AND idproveedor_58 <> $2`,
          [rut, id]
        );
        if ((dup.rowCount ?? 0) > 0) {
          res.status(400).json({ success: false, error: 'Ya existe un proveedor con ese RUT' });
          return;
        }
      }
      updates.push(`rut_58 = $${i++}`);
      values.push(rut);
    }
    if (body.contacto_58 !== undefined) {
      updates.push(`contacto_58 = $${i++}`);
      values.push(normalizeText(body.contacto_58));
    }
    if (body.telefono_58 !== undefined) {
      updates.push(`telefono_58 = $${i++}`);
      values.push(normalizeText(body.telefono_58));
    }
    if (body.email_58 !== undefined) {
      updates.push(`email_58 = $${i++}`);
      values.push(body.email_58 ? String(body.email_58).trim().toLowerCase() : null);
    }
    if (body.activo_58 !== undefined) {
      updates.push(`activo_58 = $${i++}`);
      values.push(body.activo_58);
    }
    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }
    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<Proveedor>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idproveedor_58 = $${i} RETURNING *`,
      values
    );
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Proveedor actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enUso = await pool.query(
      `SELECT 1 FROM tbl_59_m_recepcion_repuesto WHERE idproveedor_59 = $1
       UNION ALL
       SELECT 1 FROM tbl_63_m_entrega_repuesto WHERE idproveedor_63 = $1
       LIMIT 1`,
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE ${TABLA} SET activo_58 = false, actualizado_en = CURRENT_TIMESTAMP WHERE idproveedor_58 = $1`,
        [id]
      );
      res.json({
        success: true,
        message: 'Proveedor en uso: se desactivó en lugar de eliminar',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idproveedor_58 = $1 RETURNING idproveedor_58`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el proveedor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
