import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateTipoElementoEppDTO,
  TipoElementoEpp,
  UpdateTipoElementoEppDTO,
} from '../types.js';

const TABLA = 'tbl_51_tipo_elemento';

const SELECT_BASE = `
  SELECT
    t.idtipo_elemento_51,
    t.idclase_51,
    t.tipo_elemento_51,
    t.descripcion_51,
    t.activo_51,
    t.creado_en,
    t.actualizado_en,
    c.clase_56 AS clase_nombre
  FROM ${TABLA} t
  LEFT JOIN tbl_56_clase_elemento c ON t.idclase_51 = c.idclase_56
`;

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

/** Clave de unicidad: mayúsculas, sin tildes y espacios colapsados. */
function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

async function findTipoDuplicado(
  nombre: string,
  excludeId?: string | number
): Promise<boolean> {
  const result = await pool.query<{ idtipo_elemento_51: number; tipo_elemento_51: string }>(
    `SELECT idtipo_elemento_51, tipo_elemento_51 FROM ${TABLA}`
  );
  const key = normalizeKey(nombre);
  return result.rows.some(
    (row) =>
      normalizeKey(row.tipo_elemento_51) === key &&
      (excludeId === undefined || String(row.idtipo_elemento_51) !== String(excludeId))
  );
}

export const getAllTiposEpp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<TipoElementoEpp>(
      `${SELECT_BASE} ORDER BY t.tipo_elemento_51 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getTipoEppById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<TipoElementoEpp>(
      `${SELECT_BASE} WHERE t.idtipo_elemento_51 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de elemento EPP no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el tipo de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createTipoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateTipoElementoEppDTO = req.body;
    const tipo = normalizeText(body.tipo_elemento_51);
    if (!tipo) {
      res.status(400).json({ success: false, error: 'El tipo es requerido' });
      return;
    }
    if (!body.idclase_51) {
      res.status(400).json({ success: false, error: 'La clase (EPP / Ropa de Trabajo) es requerida' });
      return;
    }

    const claseOk = await pool.query(
      `SELECT idclase_56 FROM tbl_56_clase_elemento WHERE idclase_56 = $1 AND activo_56 = true`,
      [body.idclase_51]
    );
    if ((claseOk.rowCount ?? 0) === 0) {
      res.status(400).json({ success: false, error: 'Clase inválida o inactiva' });
      return;
    }

    const dup = await findTipoDuplicado(tipo);
    if (dup) {
      res.status(400).json({ success: false, error: 'Ya existe un tipo con ese nombre' });
      return;
    }

    const result = await pool.query<TipoElementoEpp>(
      `INSERT INTO ${TABLA} (idclase_51, tipo_elemento_51, descripcion_51, activo_51)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        body.idclase_51,
        tipo,
        normalizeText(body.descripcion_51),
        body.activo_51 !== undefined ? body.activo_51 : true,
      ]
    );

    const full = await pool.query<TipoElementoEpp>(
      `${SELECT_BASE} WHERE t.idtipo_elemento_51 = $1`,
      [result.rows[0].idtipo_elemento_51]
    );

    res.status(201).json({
      success: true,
      data: full.rows[0],
      message: 'Tipo de elemento EPP creado exitosamente',
    });
  } catch (error) {
    console.error('Error createTipoEpp:', error);
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      res.status(400).json({ success: false, error: 'Ya existe un tipo con ese nombre' });
      return;
    }
    if (pgCode === '23502') {
      const col = (error as { column?: string })?.column || 'desconocido';
      res.status(400).json({
        success: false,
        error: `Falta un campo obligatorio (${col})`,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear el tipo de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateTipoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateTipoElementoEppDTO = req.body;

    const exists = await pool.query(
      `SELECT idtipo_elemento_51 FROM ${TABLA} WHERE idtipo_elemento_51 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de elemento EPP no encontrado' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.idclase_51 !== undefined) {
      if (!body.idclase_51) {
        res.status(400).json({ success: false, error: 'La clase es requerida' });
        return;
      }
      const claseOk = await pool.query(
        `SELECT idclase_56 FROM tbl_56_clase_elemento WHERE idclase_56 = $1 AND activo_56 = true`,
        [body.idclase_51]
      );
      if ((claseOk.rowCount ?? 0) === 0) {
        res.status(400).json({ success: false, error: 'Clase inválida o inactiva' });
        return;
      }
      updates.push(`idclase_51 = $${i++}`);
      values.push(body.idclase_51);
    }
    if (body.tipo_elemento_51 !== undefined) {
      const tipo = normalizeText(body.tipo_elemento_51);
      if (!tipo) {
        res.status(400).json({ success: false, error: 'El tipo no puede estar vacío' });
        return;
      }
      const dup = await findTipoDuplicado(tipo, id);
      if (dup) {
        res.status(400).json({ success: false, error: 'Ya existe un tipo con ese nombre' });
        return;
      }
      updates.push(`tipo_elemento_51 = $${i++}`);
      values.push(tipo);
    }
    if (body.descripcion_51 !== undefined) {
      updates.push(`descripcion_51 = $${i++}`);
      values.push(normalizeText(body.descripcion_51));
    }
    if (body.activo_51 !== undefined) {
      updates.push(`activo_51 = $${i++}`);
      values.push(body.activo_51);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idtipo_elemento_51 = $${i}`,
      values
    );

    const full = await pool.query<TipoElementoEpp>(
      `${SELECT_BASE} WHERE t.idtipo_elemento_51 = $1`,
      [id]
    );

    res.json({
      success: true,
      data: full.rows[0],
      message: 'Tipo de elemento EPP actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el tipo de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteTipoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enCategoria = await pool.query(
      'SELECT idcategoria_elemento_52 FROM tbl_52_categoria_elemento WHERE idtipo_elemento_52 = $1 LIMIT 1',
      [id]
    );
    if ((enCategoria.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: el tipo tiene categorías asociadas',
      });
      return;
    }

    const enElemento = await pool.query(
      'SELECT idelemento_53 FROM tbl_53_elemento WHERE idtipo_elemento_53 = $1 LIMIT 1',
      [id]
    );
    if ((enElemento.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: el tipo tiene elementos asociados',
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idtipo_elemento_51 = $1 RETURNING idtipo_elemento_51`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Tipo de elemento EPP no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Tipo de elemento EPP eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el tipo de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
