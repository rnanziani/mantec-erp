import { Request, Response } from 'express';
import { pool } from '../db.js';
import { ApiResponse, CreateHerramientaDTO, Herramienta, UpdateHerramientaDTO } from '../types.js';

const TABLA = 'tbl_48_d_herramienta';

const ESTADOS_VALIDOS = new Set([
  'DISPONIBLE',
  'PRESTADA',
  'EN_MANTENCION',
  'PERDIDA',
  'DANADA',
  'DE_BAJA',
]);

const SELECT_BASE = `
  SELECT
    h.idherramienta_48,
    h.codigo_48,
    h.nombre_48,
    h.idmarca_insumo_48,
    h.marca_48,
    h.modelo_48,
    h.serie_48,
    h.ubicacion_48,
    h.valor_48,
    h.stock_48,
    h.stock_disponible_48,
    h.foto_48,
    h.estado_48,
    h.activo_48,
    h.creado_en,
    h.actualizado_en,
    m.marca_insumo_37 AS marca_insumo_nombre
  FROM ${TABLA} h
  LEFT JOIN tbl_37_marca_insumo m ON h.idmarca_insumo_48 = m.id_marca_insumo_37
`;

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t.toUpperCase() : null;
}

/** Genera código automático HER-0001, HER-0002, ... */
async function generarCodigoHerramienta(): Promise<string> {
  const result = await pool.query<{ codigo_48: string }>(
    `SELECT codigo_48
     FROM ${TABLA}
     WHERE codigo_48 ~ '^HER-[0-9]+$'
     ORDER BY CAST(SUBSTRING(codigo_48 FROM 5) AS INTEGER) DESC
     LIMIT 1`
  );

  let next = 1;
  if ((result.rowCount ?? 0) > 0) {
    const match = result.rows[0].codigo_48.match(/^HER-(\d+)$/i);
    if (match) next = Number(match[1]) + 1;
  }

  return `HER-${String(next).padStart(4, '0')}`;
}

export const getAllHerramientas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Herramienta>(
      `${SELECT_BASE} ORDER BY h.nombre_48 ASC, h.codigo_48 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount ?? undefined });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener herramientas',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getHerramientaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Herramienta>(
      `${SELECT_BASE} WHERE h.idherramienta_48 = $1`,
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

export const createHerramienta = async (req: Request, res: Response): Promise<void> => {
  try {
    const body: CreateHerramientaDTO = req.body;
    const nombre = normalizeText(body.nombre_48);
    let codigo = normalizeText(body.codigo_48);

    if (!nombre) {
      res.status(400).json({ success: false, error: 'El nombre es requerido' });
      return;
    }

    if (!codigo) {
      codigo = await generarCodigoHerramienta();
    }

    const stock = body.stock_48 ?? 1;
    const stockDisponible = body.stock_disponible_48 ?? stock;
    const valor = body.valor_48 ?? 0;
    const estado = normalizeText(body.estado_48) || 'DISPONIBLE';

    if (!ESTADOS_VALIDOS.has(estado)) {
      res.status(400).json({ success: false, error: 'Estado de herramienta inválido' });
      return;
    }
    if (stock < 0 || stockDisponible < 0 || stockDisponible > stock || valor < 0) {
      res.status(400).json({ success: false, error: 'Stock o valor inválidos' });
      return;
    }

    if (body.idmarca_insumo_48) {
      const marca = await pool.query(
        'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
        [body.idmarca_insumo_48]
      );
      if (marca.rowCount === 0) {
        res.status(400).json({ success: false, error: 'Marca de insumo no encontrada' });
        return;
      }
    }

    const dup = await pool.query(
      `SELECT idherramienta_48 FROM ${TABLA} WHERE codigo_48 = $1`,
      [codigo]
    );
    if ((dup.rowCount ?? 0) > 0) {
      res.status(400).json({ success: false, error: 'Ya existe una herramienta con ese código' });
      return;
    }

    const result = await pool.query<Herramienta>(
      `INSERT INTO ${TABLA} (
        codigo_48, nombre_48, idmarca_insumo_48, marca_48, modelo_48, serie_48,
        ubicacion_48, valor_48, stock_48, stock_disponible_48, foto_48, estado_48, activo_48
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        codigo,
        nombre,
        body.idmarca_insumo_48 || null,
        normalizeText(body.marca_48),
        normalizeText(body.modelo_48),
        normalizeText(body.serie_48),
        normalizeText(body.ubicacion_48),
        valor,
        stock,
        stockDisponible,
        body.foto_48 || null,
        estado,
        body.activo_48 !== undefined ? body.activo_48 : true,
      ]
    );

    const full = await pool.query<Herramienta>(
      `${SELECT_BASE} WHERE h.idherramienta_48 = $1`,
      [result.rows[0].idherramienta_48]
    );

    res.status(201).json({
      success: true,
      data: full.rows[0],
      message: 'Herramienta creada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la herramienta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateHerramienta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body: UpdateHerramientaDTO = req.body;

    const exists = await pool.query(
      `SELECT idherramienta_48 FROM ${TABLA} WHERE idherramienta_48 = $1`,
      [id]
    );
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
      return;
    }

    const codigo = body.codigo_48 !== undefined ? normalizeText(body.codigo_48) : undefined;
    const nombre = body.nombre_48 !== undefined ? normalizeText(body.nombre_48) : undefined;
    if (codigo !== undefined && !codigo) {
      res.status(400).json({ success: false, error: 'El código no puede estar vacío' });
      return;
    }
    if (nombre !== undefined && !nombre) {
      res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
      return;
    }

    if (codigo) {
      const dup = await pool.query(
        `SELECT idherramienta_48 FROM ${TABLA} WHERE codigo_48 = $1 AND idherramienta_48 <> $2`,
        [codigo, id]
      );
      if ((dup.rowCount ?? 0) > 0) {
        res.status(400).json({ success: false, error: 'Ya existe una herramienta con ese código' });
        return;
      }
    }

    if (body.estado_48 !== undefined) {
      const estado = normalizeText(body.estado_48);
      if (!estado || !ESTADOS_VALIDOS.has(estado)) {
        res.status(400).json({ success: false, error: 'Estado de herramienta inválido' });
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

    if (codigo !== undefined) push('codigo_48', codigo);
    if (nombre !== undefined) push('nombre_48', nombre);
    if (body.idmarca_insumo_48 !== undefined) push('idmarca_insumo_48', body.idmarca_insumo_48 || null);
    if (body.marca_48 !== undefined) push('marca_48', normalizeText(body.marca_48));
    if (body.modelo_48 !== undefined) push('modelo_48', normalizeText(body.modelo_48));
    if (body.serie_48 !== undefined) push('serie_48', normalizeText(body.serie_48));
    if (body.ubicacion_48 !== undefined) push('ubicacion_48', normalizeText(body.ubicacion_48));
    if (body.valor_48 !== undefined) push('valor_48', body.valor_48);
    if (body.stock_48 !== undefined) push('stock_48', body.stock_48);
    if (body.stock_disponible_48 !== undefined) push('stock_disponible_48', body.stock_disponible_48);
    if (body.foto_48 !== undefined) push('foto_48', body.foto_48 || null);
    if (body.estado_48 !== undefined) push('estado_48', normalizeText(body.estado_48));
    if (body.activo_48 !== undefined) push('activo_48', body.activo_48);

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    await pool.query(
      `UPDATE ${TABLA} SET ${updates.join(', ')} WHERE idherramienta_48 = $${i}`,
      values
    );

    const full = await pool.query<Herramienta>(`${SELECT_BASE} WHERE h.idherramienta_48 = $1`, [id]);
    res.json({
      success: true,
      data: full.rows[0],
      message: 'Herramienta actualizada exitosamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la herramienta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteHerramienta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const enUso = await pool.query(
      'SELECT iddpanol_50 FROM tbl_50_d_panol WHERE idherramienta_50 = $1 LIMIT 1',
      [id]
    );
    if ((enUso.rowCount ?? 0) > 0) {
      res.status(400).json({
        success: false,
        error: 'No se puede eliminar: la herramienta tiene movimientos de pañol',
      });
      return;
    }

    const result = await pool.query(
      `DELETE FROM ${TABLA} WHERE idherramienta_48 = $1 RETURNING idherramienta_48`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Herramienta no encontrada' });
      return;
    }

    res.json({ success: true, message: 'Herramienta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la herramienta',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
