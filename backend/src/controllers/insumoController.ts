import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Insumo, CreateInsumoDTO, UpdateInsumoDTO } from '../types.js';

export const getAllInsumos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Insumo>(
      `SELECT i.id_insumo_43, i.descripcion_43, i.precio_insumo_43, i.id_categoria_43, c.categoria_42
       FROM tbl_43_insumo i
       INNER JOIN tbl_42_categoria c ON i.id_categoria_43 = c.id_categoria_42
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
      `SELECT i.id_insumo_43, i.descripcion_43, i.precio_insumo_43, i.id_categoria_43, c.categoria_42
       FROM tbl_43_insumo i
       INNER JOIN tbl_42_categoria c ON i.id_categoria_43 = c.id_categoria_42
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
    const { descripcion_43, precio_insumo_43, id_categoria_43 }: CreateInsumoDTO = req.body;
    if (precio_insumo_43 === undefined || id_categoria_43 === undefined) {
      res.status(400).json({ success: false, error: 'precio_insumo_43 e id_categoria_43 son requeridos' });
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
    const cat = await pool.query('SELECT id_categoria_42 FROM tbl_42_categoria WHERE id_categoria_42 = $1', [id_categoria_43]);
    if (cat.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La categoría especificada no existe' });
      return;
    }
    let insertedRow: Insumo;
    if (descripcionNorm !== undefined) {
      const result = await pool.query<Insumo>(
        'INSERT INTO tbl_43_insumo (descripcion_43, precio_insumo_43, id_categoria_43) VALUES ($1, $2, $3) RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43',
        [descripcionNorm, precio_insumo_43, id_categoria_43]
      );
      insertedRow = result.rows[0] as any;
    } else {
      const result = await pool.query<Insumo>(
        'INSERT INTO tbl_43_insumo (precio_insumo_43, id_categoria_43) VALUES ($1, $2) RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43',
        [precio_insumo_43, id_categoria_43]
      );
      insertedRow = result.rows[0] as any;
    }
    const withJoin = await pool.query<Insumo>(
      `SELECT i.id_insumo_43, i.descripcion_43, i.precio_insumo_43, i.id_categoria_43, c.categoria_42
       FROM tbl_43_insumo i
       INNER JOIN tbl_42_categoria c ON i.id_categoria_43 = c.id_categoria_42
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
    const { descripcion_43, precio_insumo_43, id_categoria_43 }: UpdateInsumoDTO = req.body;
    const exists = await pool.query('SELECT id_insumo_43 FROM tbl_43_insumo WHERE id_insumo_43 = $1', [id]);
    if (exists.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Insumo no encontrado' });
      return;
    }
    let descripcionNorm: string | null = null;
    if (descripcion_43 !== undefined) {
      if (descripcion_43.trim() === '') {
        res.status(400).json({ success: false, error: 'descripcion_43 no puede estar vacía' });
        return;
      }
      descripcionNorm = descripcion_43.trim().toUpperCase();
      if (descripcionNorm.length > 255) {
        res.status(400).json({ success: false, error: 'descripcion_43 no puede exceder 255 caracteres' });
        return;
      }
    }
    if (id_categoria_43 !== undefined) {
      const cat = await pool.query('SELECT id_categoria_42 FROM tbl_42_categoria WHERE id_categoria_42 = $1', [id_categoria_43]);
      if (cat.rowCount === 0) {
        res.status(400).json({ success: false, error: 'La categoría especificada no existe' });
        return;
      }
    }
    const result = await pool.query<Insumo>(
      `UPDATE tbl_43_insumo
       SET descripcion_43 = COALESCE($1, descripcion_43),
           precio_insumo_43 = COALESCE($2, precio_insumo_43),
           id_categoria_43 = COALESCE($3, id_categoria_43)
       WHERE id_insumo_43 = $4
       RETURNING id_insumo_43, descripcion_43, precio_insumo_43, id_categoria_43`,
      [descripcionNorm, precio_insumo_43 ?? null, id_categoria_43 ?? null, id]
    );
    const updated = result.rows[0];
    const withJoin = await pool.query<Insumo>(
      `SELECT i.id_insumo_43, i.descripcion_43, i.precio_insumo_43, i.id_categoria_43, c.categoria_42
       FROM tbl_43_insumo i
       INNER JOIN tbl_42_categoria c ON i.id_categoria_43 = c.id_categoria_42
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
