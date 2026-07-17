import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Insumo, CreateInsumoDTO, UpdateInsumoDTO } from '../types.js';

const INSUMO_SELECT = `
  SELECT i.id_insumo_43, i.descripcion_43, i.precio_insumo_43, i.id_categoria_43,
         i.codigo_insumo_43, i.id_marca_insumo_43, c.categoria_42, m.marca_insumo_37
  FROM tbl_43_insumo i
  INNER JOIN tbl_42_categoria c ON i.id_categoria_43 = c.id_categoria_42
  LEFT JOIN tbl_37_marca_insumo m ON i.id_marca_insumo_43 = m.id_marca_insumo_37`;

function parseCodigoInsumo(raw: unknown): { value: string | null } | { error: string } {
  if (raw === undefined || raw === null) return { value: null };
  const trimmed = String(raw).trim();
  if (trimmed === '') return { value: null };
  if (trimmed.length !== 20 || !/^[0-9A-Za-z]{20}$/.test(trimmed)) {
    return { error: 'El código debe tener exactamente 20 caracteres alfanuméricos' };
  }
  return { value: trimmed };
}

async function validateMarcaInsumo(id_marca_insumo_43: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT id_marca_insumo_37 FROM tbl_37_marca_insumo WHERE id_marca_insumo_37 = $1',
    [id_marca_insumo_43]
  );
  return (result.rowCount ?? 0) > 0;
}

export const getAllInsumos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Insumo>(
      `${INSUMO_SELECT}
       ORDER BY i.id_insumo_43 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener insumos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getInsumoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Insumo>(
      `${INSUMO_SELECT}
       WHERE i.id_insumo_43 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Insumo no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43 }: CreateInsumoDTO = req.body;
    if (precio_insumo_43 === undefined || id_categoria_43 === undefined) {
      res.status(400).json({ success: false, error: 'precio_insumo_43 e id_categoria_43 son requeridos' });
      return;
    }
    if (id_marca_insumo_43 === undefined) {
      res.status(400).json({ success: false, error: 'id_marca_insumo_43 es requerido' });
      return;
    }
    if (descripcion_43 !== undefined && descripcion_43.trim() === '') {
      res.status(400).json({ success: false, error: 'descripcion_43 no puede estar vacía' });
      return;
    }
    const descripcionNorm = descripcion_43 ? descripcion_43.trim().toUpperCase() : undefined;
    if (descripcionNorm && descripcionNorm.length > 255) {
      res.status(400).json({ success: false, error: 'descripcion_43 no puede exceder 255 caracteres' });
      return;
    }
    const codigoParsed = parseCodigoInsumo(codigo_insumo_43);
    if ('error' in codigoParsed) {
      res.status(400).json({ success: false, error: codigoParsed.error });
      return;
    }
    const cat = await pool.query('SELECT id_categoria_42 FROM tbl_42_categoria WHERE id_categoria_42 = $1', [id_categoria_43]);
    if (cat.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La categoría especificada no existe' });
      return;
    }
    if (!(await validateMarcaInsumo(id_marca_insumo_43))) {
      res.status(400).json({ success: false, error: 'La marca especificada no existe' });
      return;
    }
    let insertedRow: Insumo;
    if (descripcionNorm !== undefined) {
      const result = await pool.query<Insumo>(
        `INSERT INTO tbl_43_insumo (descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43`,
        [descripcionNorm, precio_insumo_43, id_categoria_43, codigoParsed.value, id_marca_insumo_43]
      );
      insertedRow = result.rows[0] as Insumo;
    } else {
      const result = await pool.query<Insumo>(
        `INSERT INTO tbl_43_insumo (precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43)
         VALUES ($1, $2, $3, $4)
         RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43`,
        [precio_insumo_43, id_categoria_43, codigoParsed.value, id_marca_insumo_43]
      );
      insertedRow = result.rows[0] as Insumo;
    }
    const withJoin = await pool.query<Insumo>(
      `${INSUMO_SELECT}
       WHERE i.id_insumo_43 = $1`,
      [insertedRow.id_insumo_43]
    );
    res.status(201).json({ success: true, data: withJoin.rows[0], message: 'Insumo creado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const updateInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43 }: UpdateInsumoDTO = req.body;
    const exists = await pool.query('SELECT id_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1', [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Insumo no encontrado' });
      return;
    }
    if (!descripcion_43 || descripcion_43.trim() === '') {
      res.status(400).json({ success: false, error: 'descripcion_43 no puede estar vacía' });
      return;
    }
    if (precio_insumo_43 === undefined || id_categoria_43 === undefined || id_marca_insumo_43 === undefined) {
      res.status(400).json({
        success: false,
        error: 'precio_insumo_43, id_categoria_43 e id_marca_insumo_43 son requeridos'
      });
      return;
    }
    const descripcionNorm = descripcion_43.trim().toUpperCase();
    if (descripcionNorm.length > 255) {
      res.status(400).json({ success: false, error: 'descripcion_43 no puede exceder 255 caracteres' });
      return;
    }
    const codigoParsed = parseCodigoInsumo(codigo_insumo_43);
    if ('error' in codigoParsed) {
      res.status(400).json({ success: false, error: codigoParsed.error });
      return;
    }
    const cat = await pool.query('SELECT id_categoria_42 FROM tbl_42_categoria WHERE id_categoria_42 = $1', [id_categoria_43]);
    if (cat.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La categoría especificada no existe' });
      return;
    }
    if (!(await validateMarcaInsumo(id_marca_insumo_43))) {
      res.status(400).json({ success: false, error: 'La marca especificada no existe' });
      return;
    }
    const result = await pool.query<Insumo>(
      `UPDATE tbl_43_insumo
       SET descripcion_43 = $1,
           precio_insumo_43 = $2,
           id_categoria_43 = $3,
           codigo_insumo_43 = $4,
           id_marca_insumo_43 = $5
       WHERE id_insumo_43 = $6
       RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43, codigo_insumo_43, id_marca_insumo_43`,
      [descripcionNorm, precio_insumo_43, id_categoria_43, codigoParsed.value, id_marca_insumo_43, id]
    );
    const updated = result.rows[0];
    const withJoin = await pool.query<Insumo>(
      `${INSUMO_SELECT}
       WHERE i.id_insumo_43 = $1`,
      [updated.id_insumo_43]
    );
    res.json({ success: true, data: withJoin.rows[0], message: 'Insumo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteInsumo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tbl_43_insumo WHERE id_insumo_43 = $1 RETURNING id_insumo_43', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Insumo no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Insumo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el insumo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
