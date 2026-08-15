import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CategoriaElementoEpp,
  CreateCategoriaElementoEppDTO,
  UpdateCategoriaElementoEppDTO,
} from '../types.js';

const TABLA = 'tbl_52_categoria_elemento';

const SELECT_BASE = `
  SELECT
    c.idcategoria_elemento_52,
    c.idtipo_elemento_52,
    c.categoria_52,
    c.descripcion_52,
    c.activo_52,
    c.creado_en,
    c.actualizado_en,
    t.tipo_elemento_51 AS tipo_elemento_nombre
  FROM ${TABLA} c
  INNER JOIN tbl_51_tipo_elemento t ON c.idtipo_elemento_52 = t.idtipo_elemento_51
`;

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

export const getAllCategoriasEpp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<CategoriaElementoEpp>(
      `${SELECT_BASE} ORDER BY t.tipo_elemento_51 ASC, c.categoria_52 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getCategoriaEppById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<CategoriaElementoEpp>(
      `${SELECT_BASE} WHERE c.idcategoria_elemento_52 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría de elemento EPP no encontrada' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la categoría de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createCategoriaEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateCategoriaElementoEppDTO = req.body;
    const categoria = normalizeText(body.categoria_52);

    if (!body.idtipo_elemento_52) {
      res.status(400).json({ success: false, error: 'El tipo es requerido' });
      return;
    }
    if (!categoria) {
      res.status(400).json({ success: false, error: 'La categoría es requerida' });
      return;
    }

    const tipo = await pool.query(
      'SELECT idtipo_elemento_51 FROM tbl_51_tipo_elemento WHERE idtipo_elemento_51 = $1',
      [body.idtipo_elemento_52]
    );
    if (tipo.rowCount === 0) {
      res.status(400).json({ success: false, error: 'Tipo de elemento no encontrado' });
      return;
    }

    const dup = await pool.query(
      `SELECT idcategoria_elemento_52 FROM ${TABLA}
       WHERE idtipo_elemento_52 = $1 AND categoria_52 = $2`,
      [body.idtipo_elemento_52, categoria]
    );
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'Ya existe esa categoría para el tipo seleccionado',
      });
      return;
    }

    const inserted = await pool.query<{ idcategoria_elemento_52: number }>(
      `INSERT INTO ${TABLA} (idtipo_elemento_52, categoria_52, descripcion_52, activo_52)
       VALUES ($1, $2, $3, $4)
       RETURNING idcategoria_elemento_52`,
      [
        body.idtipo_elemento_52,
        categoria,
        normalizeText(body.descripcion_52),
        body.activo_52 !== undefined ? body.activo_52 : true,
      ]
    );

    const full = await pool.query<CategoriaElementoEpp>(
      `${SELECT_BASE} WHERE c.idcategoria_elemento_52 = $1`,
      [inserted.rows[0].idcategoria_elemento_52]
    );

    res.status(201).json({
      success: true,
      data: full.rows[0],
      message: 'Categoría de elemento EPP creada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la categoría de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateCategoriaEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateCategoriaElementoEppDTO = req.body;

    const exists = await pool.query(
      `SELECT idcategoria_elemento_52, idtipo_elemento_52, categoria_52
       FROM ${TABLA} WHERE idcategoria_elemento_52 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría de elemento EPP no encontrada' });
      return;
    }

    const actual = exists.rows[0];
    const idTipo = body.idtipo_elemento_52 ?? actual.idtipo_elemento_52;
    const categoria =
      body.categoria_52 !== undefined
        ? normalizeText(body.categoria_52)
        : actual.categoria_52;

    if (body.categoria_52 !== undefined && !categoria) {
      res.status(400).json({ success: false, error: 'La categoría no puede estar vacía' });
      return;
    }

    if (body.idtipo_elemento_52 !== undefined) {
      const tipo = await pool.query(
        'SELECT idtipo_elemento_51 FROM tbl_51_tipo_elemento WHERE idtipo_elemento_51 = $1',
        [body.idtipo_elemento_52]
      );
      if (tipo.rowCount === 0) {
        res.status(400).json({ success: false, error: 'Tipo de elemento no encontrado' });
        return;
      }
    }

    if (body.categoria_52 !== undefined || body.idtipo_elemento_52 !== undefined) {
      const dup = await pool.query(
        `SELECT idcategoria_elemento_52 FROM ${TABLA}
         WHERE idtipo_elemento_52 = $1 AND categoria_52 = $2 AND idcategoria_elemento_52 <> $3`,
        [idTipo, categoria, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({
          success: false,
          error: 'Ya existe esa categoría para el tipo seleccionado',
        });
        return;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.idtipo_elemento_52 !== undefined) {
      updates.push(`idtipo_elemento_52 = $${i++}`);
      values.push(body.idtipo_elemento_52);
    }
    if (body.categoria_52 !== undefined) {
      updates.push(`categoria_52 = $${i++}`);
      values.push(categoria);
    }
    if (body.descripcion_52 !== undefined) {
      updates.push(`descripcion_52 = $${i++}`);
      values.push(normalizeText(body.descripcion_52));
    }
    if (body.activo_52 !== undefined) {
      updates.push(`activo_52 = $${i++}`);
      values.push(body.activo_52);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idcategoria_elemento_52 = $${i}`,
      values
    );

    const full = await pool.query<CategoriaElementoEpp>(
      `${SELECT_BASE} WHERE c.idcategoria_elemento_52 = $1`,
      [id]
    );

    res.json({
      success: true,
      data: full.rows[0],
      message: 'Categoría de elemento EPP actualizada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la categoría de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteCategoriaEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enUso = await pool.query(
      'SELECT idelemento_53 FROM tbl_53_elemento WHERE idcategoria_53 = $1 LIMIT 1',
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: la categoría tiene elementos asociados',
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idcategoria_elemento_52 = $1 RETURNING idcategoria_elemento_52`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Categoría de elemento EPP no encontrada' });
      return;
    }

    res.json({ success: true, message: 'Categoría de elemento EPP eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la categoría de elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
