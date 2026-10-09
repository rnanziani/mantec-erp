import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateRepuestoDanadoDTO,
  RepuestoDanado,
  UpdateRepuestoDanadoDTO,
} from '../types.js';

const TABLA = 'tbl_57_repuesto_danado';

/** Patrón fijo: TIPO-###  (ej. ALT-001, BOM-002) */
const CODIGO_PATTERN = /^[A-Z]{2,10}-\d{3,6}$/;
const CODIGO_HINT =
  'El código debe seguir el patrón TIPO-### (ej. ALT-001, BOM-002): 2 a 10 letras, guion y 3 a 6 dígitos';

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

/** Primeras 3 letras A-Z del nombre (sin tildes). CALIPER SCANIA → CAL. */
function prefijoDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

async function generarCodigoUnico(nombre: string): Promise<string | { error: string }> {
  const prefijo = prefijoDesdeNombre(nombre);
  if (prefijo.length < 3) {
    return { error: 'El nombre debe tener al menos 3 letras para armar el código (ej. CALIPER → CAL-001)' };
  }
  const existentes = await pool.query<{ codigo_57: string }>(
    `SELECT codigo_57 FROM ${TABLA} WHERE codigo_57 ~ ('^' || $1 || '-[0-9]+$')`,
    [prefijo]
  );
  let max = 0;
  const re = new RegExp(`^${prefijo}-(\\d+)$`);
  for (const row of existentes.rows) {
    const m = re.exec(String(row.codigo_57 || '').toUpperCase());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const codigo = `${prefijo}-${String(max + 1).padStart(3, '0')}`;
  if (!CODIGO_PATTERN.test(codigo)) return { error: CODIGO_HINT };
  return codigo;
}

export const getAllRepuestosDanados = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<RepuestoDanado>(
      `SELECT idrepuestodanado_57, codigo_57, nombre_57, descripcion_57, activo_57, creado_en, actualizado_en
       FROM ${TABLA}
       ORDER BY nombre_57 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener repuestos dañados',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getRepuestoDanadoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<RepuestoDanado>(
      `SELECT * FROM ${TABLA} WHERE idrepuestodanado_57 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateRepuestoDanadoDTO = req.body;
    const nombre = normalizeText(body.nombre_57);
    if (!nombre) {
      res.status(400).json({ success: false, error: 'El nombre es requerido' });
      return;
    }
    const generado = await generarCodigoUnico(nombre);
    if (typeof generado !== 'string') {
      res.status(400).json({ success: false, error: generado.error });
      return;
    }
    const codigo = generado;
    const result = await pool.query<RepuestoDanado>(
      `INSERT INTO ${TABLA} (codigo_57, nombre_57, descripcion_57, activo_57)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        codigo,
        nombre,
        normalizeText(body.descripcion_57),
        body.activo_57 !== undefined ? body.activo_57 : true,
      ]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Repuesto dañado creado exitosamente',
    });
  } catch (error) {
    const pg = error as { code?: string };
    if (pg.code === '23505') {
      res.status(400).json({
        success: false,
        error: 'Ese código se ocupó al mismo tiempo. Vuelva a guardar.',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateRepuestoDanadoDTO = req.body;
    const exists = await pool.query(`SELECT idrepuestodanado_57 FROM ${TABLA} WHERE idrepuestodanado_57 = $1`, [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.nombre_57 !== undefined) {
      const nombre = normalizeText(body.nombre_57);
      if (!nombre) {
        res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
        return;
      }
      updates.push(`nombre_57 = $${i++}`);
      values.push(nombre);
    }
    // El código es identidad: no se cambia al editar (evita romper expedientes).
    if (body.descripcion_57 !== undefined) {
      updates.push(`descripcion_57 = $${i++}`);
      values.push(normalizeText(body.descripcion_57));
    }
    if (body.activo_57 !== undefined) {
      updates.push(`activo_57 = $${i++}`);
      values.push(body.activo_57);
    }
    if (!updates.length) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }
    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query<RepuestoDanado>(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idrepuestodanado_57 = $${i} RETURNING *`,
      values
    );
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Repuesto dañado actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteRepuestoDanado = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enUso = await pool.query(
      `SELECT 1 FROM tbl_60_d_recepcion_repuesto WHERE idrepuestodanado_60 = $1 LIMIT 1`,
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE ${TABLA} SET activo_57 = false, actualizado_en = CURRENT_TIMESTAMP WHERE idrepuestodanado_57 = $1`,
        [id]
      );
      res.json({
        success: true,
        message: 'Repuesto en uso: se desactivó en lugar de eliminar',
      });
      return;
    }
    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idrepuestodanado_57 = $1 RETURNING idrepuestodanado_57`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Repuesto dañado no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Repuesto dañado eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el repuesto dañado',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
