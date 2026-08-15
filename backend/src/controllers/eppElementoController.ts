import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  CreateElementoEppDTO,
  ElementoEpp,
  UpdateElementoEppDTO,
} from '../types.js';

const TABLA = 'tbl_53_elemento';

const SELECT_BASE = `
  SELECT
    e.idelemento_53,
    e.codigo_53,
    e.nombre_53,
    e.idcategoria_53,
    e.idtipo_elemento_53,
    e.idmarca_53,
    e.descripcion_53,
    e.unidad_medida_53,
    e.stock_actual_53,
    e.stock_minimo_53,
    e.valor_unitario_53,
    e.activo_53,
    e.creado_en,
    e.actualizado_en,
    t.tipo_elemento_51 AS tipo_elemento_nombre,
    c.categoria_52 AS categoria_nombre,
    m.marca_insumo_37 AS marca_nombre
  FROM ${TABLA} e
  INNER JOIN tbl_51_tipo_elemento t ON e.idtipo_elemento_53 = t.idtipo_elemento_51
  INNER JOIN tbl_52_categoria_elemento c ON e.idcategoria_53 = c.idcategoria_elemento_52
  LEFT JOIN tbl_37_marca_insumo m ON e.idmarca_53 = m.id_marca_insumo_37
`;

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

/** Genera código automático EPP-0001, EPP-0002, ... */
async function generarCodigoElemento(): Promise<string> {
  const result = await pool.query<{ codigo_53: string }>(
    `SELECT codigo_53
     FROM ${TABLA}
     WHERE codigo_53 ~ '^EPP-[0-9]+$'
     ORDER BY CAST(SUBSTRING(codigo_53 FROM 5) AS INTEGER) DESC
     LIMIT 1`
  );

  let next = 1;
  if ((result.rowCount ?? 0) > 0) {
    const match = result.rows[0].codigo_53.match(/^EPP-(\d+)$/i);
    if (match) next = Number(match[1]) + 1;
  }

  return `EPP-${String(next).padStart(4, '0')}`;
}

export const getAllElementosEpp = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<ElementoEpp>(
      `${SELECT_BASE} ORDER BY e.nombre_53 ASC, e.codigo_53 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener elementos EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getElementoEppById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<ElementoEpp>(
      `${SELECT_BASE} WHERE e.idelemento_53 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Elemento EPP no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createElementoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateElementoEppDTO = req.body;
    const nombre = normalizeText(body.nombre_53);
    let codigo = normalizeText(body.codigo_53);

    if (!nombre) {
      res.status(400).json({ success: false, error: 'El nombre es requerido' });
      return;
    }
    if (!body.idtipo_elemento_53) {
      res.status(400).json({ success: false, error: 'El tipo es requerido' });
      return;
    }
    if (!body.idcategoria_53) {
      res.status(400).json({ success: false, error: 'La categoría es requerida' });
      return;
    }

    if (!codigo) {
      codigo = await generarCodigoElemento();
    }

    const stock = body.stock_actual_53 ?? 0;
    const stockMin = body.stock_minimo_53 ?? 5;
    const valor = body.valor_unitario_53 ?? 0;
    const unidad = normalizeText(body.unidad_medida_53) || 'UNIDAD';

    if (stock < 0 || stockMin < 0) {
      res.status(400).json({ success: false, error: 'El stock no puede ser negativo' });
      return;
    }
    if (valor < 0) {
      res.status(400).json({ success: false, error: 'El valor unitario no puede ser negativo' });
      return;
    }

    const tipo = await pool.query(
      'SELECT idtipo_elemento_51 FROM tbl_51_tipo_elemento WHERE idtipo_elemento_51 = $1',
      [body.idtipo_elemento_53]
    );
    if (tipo.rowCount === 0) {
      res.status(400).json({ success: false, error: 'Tipo de elemento no encontrado' });
      return;
    }

    const cat = await pool.query(
      `SELECT idcategoria_elemento_52 FROM tbl_52_categoria_elemento
       WHERE idcategoria_elemento_52 = $1 AND idtipo_elemento_52 = $2`,
      [body.idcategoria_53, body.idtipo_elemento_53]
    );
    if (cat.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'La categoría no existe o no pertenece al tipo seleccionado',
      });
      return;
    }

    if (body.idmarca_53) {
      const marca = await pool.query(
        'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
        [body.idmarca_53]
      );
      if (marca.rowCount === 0) {
        res.status(400).json({ success: false, error: 'Marca de insumo no encontrada' });
        return;
      }
    }

    const dup = await pool.query(
      `SELECT idelemento_53 FROM ${TABLA} WHERE codigo_53 = $1`,
      [codigo]
    );
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe un elemento con ese código' });
      return;
    }

    const inserted = await pool.query<{ idelemento_53: number }>(
      `INSERT INTO ${TABLA} (
        codigo_53, nombre_53, idcategoria_53, idtipo_elemento_53, idmarca_53,
        descripcion_53, unidad_medida_53, stock_actual_53, stock_minimo_53,
        valor_unitario_53, activo_53
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING idelemento_53`,
      [
        codigo,
        nombre,
        body.idcategoria_53,
        body.idtipo_elemento_53,
        body.idmarca_53 || null,
        normalizeText(body.descripcion_53),
        unidad,
        stock,
        stockMin,
        valor,
        body.activo_53 !== undefined ? body.activo_53 : true,
      ]
    );

    const full = await pool.query<ElementoEpp>(
      `${SELECT_BASE} WHERE e.idelemento_53 = $1`,
      [inserted.rows[0].idelemento_53]
    );

    res.status(201).json({
      success: true,
      data: full.rows[0],
      message: 'Elemento EPP creado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateElementoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateElementoEppDTO = req.body;

    const exists = await pool.query(
      `SELECT idelemento_53, idtipo_elemento_53, idcategoria_53 FROM ${TABLA} WHERE idelemento_53 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Elemento EPP no encontrado' });
      return;
    }

    const actual = exists.rows[0];
    const codigo = body.codigo_53 !== undefined ? normalizeText(body.codigo_53) : undefined;
    const nombre = body.nombre_53 !== undefined ? normalizeText(body.nombre_53) : undefined;

    if (codigo !== undefined && !codigo) {
      res.status(400).json({ success: false, error: 'El código no puede estar vacío' });
      return;
    }
    if (nombre !== undefined && !nombre) {
      res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
      return;
    }

    if (body.stock_actual_53 !== undefined && body.stock_actual_53 < 0) {
      res.status(400).json({ success: false, error: 'El stock no puede ser negativo' });
      return;
    }
    if (body.stock_minimo_53 !== undefined && body.stock_minimo_53 < 0) {
      res.status(400).json({ success: false, error: 'El stock mínimo no puede ser negativo' });
      return;
    }
    if (body.valor_unitario_53 !== undefined && body.valor_unitario_53 !== null && body.valor_unitario_53 < 0) {
      res.status(400).json({ success: false, error: 'El valor unitario no puede ser negativo' });
      return;
    }

    if (codigo) {
      const dup = await pool.query(
        `SELECT idelemento_53 FROM ${TABLA} WHERE codigo_53 = $1 AND idelemento_53 <> $2`,
        [codigo, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe un elemento con ese código' });
        return;
      }
    }

    const idTipo = body.idtipo_elemento_53 ?? actual.idtipo_elemento_53;
    const idCat = body.idcategoria_53 ?? actual.idcategoria_53;

    if (body.idtipo_elemento_53 !== undefined) {
      const tipo = await pool.query(
        'SELECT idtipo_elemento_51 FROM tbl_51_tipo_elemento WHERE idtipo_elemento_51 = $1',
        [body.idtipo_elemento_53]
      );
      if (tipo.rowCount === 0) {
        res.status(400).json({ success: false, error: 'Tipo de elemento no encontrado' });
        return;
      }
    }

    if (body.idcategoria_53 !== undefined || body.idtipo_elemento_53 !== undefined) {
      const cat = await pool.query(
        `SELECT idcategoria_elemento_52 FROM tbl_52_categoria_elemento
         WHERE idcategoria_elemento_52 = $1 AND idtipo_elemento_52 = $2`,
        [idCat, idTipo]
      );
      if (cat.rowCount === 0) {
        res.status(400).json({
          success: false,
          error: 'La categoría no existe o no pertenece al tipo seleccionado',
        });
        return;
      }
    }

    if (body.idmarca_53) {
      const marca = await pool.query(
        'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
        [body.idmarca_53]
      );
      if (marca.rowCount === 0) {
        res.status(400).json({ success: false, error: 'Marca de insumo no encontrada' });
        return;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const push = (col: string, val: unknown) => {
      updates.push(`${col} = $${i++}`);
      values.push(val);
    };

    if (codigo !== undefined) push('codigo_53', codigo);
    if (nombre !== undefined) push('nombre_53', nombre);
    if (body.idcategoria_53 !== undefined) push('idcategoria_53', body.idcategoria_53);
    if (body.idtipo_elemento_53 !== undefined) push('idtipo_elemento_53', body.idtipo_elemento_53);
    if (body.idmarca_53 !== undefined) push('idmarca_53', body.idmarca_53 || null);
    if (body.descripcion_53 !== undefined) push('descripcion_53', normalizeText(body.descripcion_53));
    if (body.unidad_medida_53 !== undefined) {
      push('unidad_medida_53', normalizeText(body.unidad_medida_53) || 'UNIDAD');
    }
    if (body.stock_actual_53 !== undefined) push('stock_actual_53', body.stock_actual_53);
    if (body.stock_minimo_53 !== undefined) push('stock_minimo_53', body.stock_minimo_53);
    if (body.valor_unitario_53 !== undefined) push('valor_unitario_53', body.valor_unitario_53);
    if (body.activo_53 !== undefined) push('activo_53', body.activo_53);

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idelemento_53 = $${i}`,
      values
    );

    const full = await pool.query<ElementoEpp>(`${SELECT_BASE} WHERE e.idelemento_53 = $1`, [id]);
    res.json({
      success: true,
      data: full.rows[0],
      message: 'Elemento EPP actualizado exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteElementoEpp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enUso = await pool.query(
      'SELECT iddetalleentrega_55 FROM tbl_55_d_entrega_epp WHERE idelemento_55 = $1 LIMIT 1',
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: el elemento tiene entregas asociadas',
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idelemento_53 = $1 RETURNING idelemento_53`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Elemento EPP no encontrado' });
      return;
    }

    res.json({ success: true, message: 'Elemento EPP eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el elemento EPP',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
