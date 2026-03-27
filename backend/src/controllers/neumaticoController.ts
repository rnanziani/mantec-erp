import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Neumatico, CreateNeumaticoDTO, UpdateNeumaticoDTO } from '../types.js';

export const getAllNeumaticos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Neumatico>(
      `SELECT 
        n.id_neumatico_31, 
        n.cod_neumatico_31, 
        n.id_marca_31,
        n.fecha_ingreso_31,
        n.observaciones_31,
        m.marca_32
       FROM tbl_31_neumatico n
       INNER JOIN tbl_32_marca_neumatico m ON n.id_marca_31 = m.id_marca_32
       ORDER BY n.id_neumatico_31 ASC`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener los neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getNeumaticoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<Neumatico>(
      `SELECT 
        n.id_neumatico_31, 
        n.cod_neumatico_31, 
        n.id_marca_31,
        n.fecha_ingreso_31,
        n.observaciones_31,
        m.marca_32
       FROM tbl_31_neumatico n
       INNER JOIN tbl_32_marca_neumatico m ON n.id_marca_31 = m.id_marca_32
       WHERE n.id_neumatico_31 = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_marca_31, fecha_ingreso_31, observaciones_31 }: CreateNeumaticoDTO = req.body;

    if (!id_marca_31) {
      res.status(400).json({ success: false, error: 'El ID de la marca es requerido' });
      return;
    }

    const marcaExists = await pool.query(
      'SELECT id_marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1 AND estado_32 = true',
      [id_marca_31]
    );
    if (marcaExists.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La marca seleccionada no existe o está inactiva' });
      return;
    }

    // Generar código automáticamente: 5 dígitos (secuencial) + 2 dígitos (año) = ej: 0000126
    const fechaIngreso = fecha_ingreso_31 ? new Date(fecha_ingreso_31) : new Date();
    const yearShort = String(fechaIngreso.getFullYear() % 100).padStart(2, '0'); // 26 para 2026
    const maxResult = await pool.query<{ max_seq: string }>(
      `SELECT COALESCE(MAX(SUBSTRING(cod_neumatico_31 FROM 1 FOR 5)), '00000') AS max_seq 
       FROM tbl_31_neumatico 
       WHERE cod_neumatico_31 LIKE $1`,
      ['%' + yearShort]
    );
    const nextSeq = parseInt(maxResult.rows[0]?.max_seq ?? '0', 10) + 1;
    const codNeumatico = String(nextSeq).padStart(5, '0') + yearShort;

    const result = await pool.query<Neumatico>(
      `INSERT INTO tbl_31_neumatico (cod_neumatico_31, id_marca_31, fecha_ingreso_31, observaciones_31) 
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4) 
       RETURNING id_neumatico_31, cod_neumatico_31, id_marca_31, fecha_ingreso_31, observaciones_31`,
      [codNeumatico, id_marca_31, fecha_ingreso_31 || null, observaciones_31?.trim() || null]
    );

    const row = result.rows[0];
    const marcaRes = await pool.query('SELECT marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1', [id_marca_31]);
    const data = { ...row, marca_32: marcaRes.rows[0]?.marca_32 };

    res.status(201).json({ success: true, data, message: 'Neumático creado exitosamente' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al crear neumático:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el neumático',
      message: errMsg
    });
  }
};

export const updateNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { id_marca_31, fecha_ingreso_31, observaciones_31 }: UpdateNeumaticoDTO = req.body;

    if (id_marca_31 != null) {
      const marcaExists = await pool.query(
        'SELECT id_marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1 AND estado_32 = true',
        [id_marca_31]
      );
      if (marcaExists.rowCount === 0) {
        res.status(400).json({ success: false, error: 'La marca seleccionada no existe o está inactiva' });
        return;
      }
    }

    const obsVal = observaciones_31 !== undefined ? (observaciones_31?.trim() || null) : undefined;
    const result = await pool.query<Neumatico>(
      `UPDATE tbl_31_neumatico SET 
        id_marca_31 = COALESCE($1, id_marca_31),
        fecha_ingreso_31 = COALESCE($2::date, fecha_ingreso_31),
        observaciones_31 = COALESCE($3, observaciones_31)
       WHERE id_neumatico_31 = $4 
       RETURNING id_neumatico_31, cod_neumatico_31, id_marca_31, fecha_ingreso_31, observaciones_31`,
      [id_marca_31 ?? null, fecha_ingreso_31 || null, obsVal, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }

    const row = result.rows[0];
    const marcaRes = await pool.query('SELECT marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1', [row.id_marca_31]);
    const data = { ...row, marca_32: marcaRes.rows[0]?.marca_32 };

    res.json({ success: true, data, message: 'Neumático actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteNeumatico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tbl_31_neumatico WHERE id_neumatico_31 = $1 RETURNING id_neumatico_31', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Neumático no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Neumático eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el neumático',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
