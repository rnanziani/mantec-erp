import { Request, Response } from 'express';
import { pool } from '../db.js';
import { Neumatico, CreateNeumaticoDTO, CreateNeumaticoLoteDTO, UpdateNeumaticoDTO } from '../types.js';

export const getAllNeumaticos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<Neumatico>(
      `SELECT 
        n.id_neumatico_31, 
        n.cod_neumatico_31, 
        n.id_marca_31,
        n.id_estado_31,
        n.fecha_ingreso_31,
        n.observaciones_31,
        m.marca_32,
        e.estado_33
       FROM tbl_31_neumatico n
       INNER JOIN tbl_32_marca_neumatico m ON n.id_marca_31 = m.id_marca_32
       LEFT JOIN tbl_33_estado_neumatico e ON n.id_estado_31 = e.id_estado_33
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
        n.id_estado_31,
        n.fecha_ingreso_31,
        n.observaciones_31,
        m.marca_32,
        e.estado_33
       FROM tbl_31_neumatico n
       INNER JOIN tbl_32_marca_neumatico m ON n.id_marca_31 = m.id_marca_32
       LEFT JOIN tbl_33_estado_neumatico e ON n.id_estado_31 = e.id_estado_33
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

    // El trigger generar_codigo_neumatico_31 asigna TS-NNNNYY (ej. TS-000026)
    const result = await pool.query<Neumatico>(
      `INSERT INTO tbl_31_neumatico (id_marca_31, fecha_ingreso_31, observaciones_31)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3)
       RETURNING id_neumatico_31, cod_neumatico_31, id_marca_31, id_estado_31,
                 fecha_ingreso_31, observaciones_31`,
      [id_marca_31, fecha_ingreso_31 || null, observaciones_31?.trim() || null]
    );

    const row = result.rows[0];
    const extra = await pool.query<{ marca_32: string; estado_33: string | null }>(
      `SELECT m.marca_32, e.estado_33
       FROM tbl_32_marca_neumatico m
       LEFT JOIN tbl_33_estado_neumatico e ON e.id_estado_33 = $2
       WHERE m.id_marca_32 = $1`,
      [id_marca_31, row.id_estado_31]
    );
    const data = {
      ...row,
      marca_32: extra.rows[0]?.marca_32,
      estado_33: extra.rows[0]?.estado_33,
    };

    res.status(201).json({
      success: true,
      data,
      message: `Neumático ${row.cod_neumatico_31} creado exitosamente`,
    });
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

export const createNeumaticosLote = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id_marca_31, fecha_ingreso_31, observaciones_31, cantidad }: CreateNeumaticoLoteDTO = req.body;
    const n = Number(cantidad);
    if (!id_marca_31) {
      res.status(400).json({ success: false, error: 'El ID de la marca es requerido' });
      return;
    }
    if (!Number.isInteger(n) || n < 2 || n > 12) {
      res.status(400).json({ success: false, error: 'La cantidad masiva debe ser un entero entre 2 y 12' });
      return;
    }

    const marcaExists = await client.query(
      'SELECT id_marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1 AND estado_32 = true',
      [id_marca_31]
    );
    if (marcaExists.rowCount === 0) {
      res.status(400).json({ success: false, error: 'La marca seleccionada no existe o está inactiva' });
      return;
    }

    await client.query('BEGIN');
    const creados: Neumatico[] = [];
    for (let i = 0; i < n; i++) {
      const result = await client.query<Neumatico>(
        `INSERT INTO tbl_31_neumatico (id_marca_31, fecha_ingreso_31, observaciones_31)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3)
         RETURNING id_neumatico_31, cod_neumatico_31, id_marca_31, id_estado_31,
                   fecha_ingreso_31, observaciones_31`,
        [id_marca_31, fecha_ingreso_31 || null, observaciones_31?.trim() || null]
      );
      creados.push(result.rows[0]);
    }
    await client.query('COMMIT');

    const extra = await pool.query<{ marca_32: string }>(
      'SELECT marca_32 FROM tbl_32_marca_neumatico WHERE id_marca_32 = $1',
      [id_marca_31]
    );
    const marca = extra.rows[0]?.marca_32;
    const data = creados.map((row) => ({ ...row, marca_32: marca }));
    const codigos = data.map((r) => r.cod_neumatico_31).join(', ');

    res.status(201).json({
      success: true,
      data,
      count: data.length,
      message: `${data.length} neumáticos creados: ${codigos}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({
      success: false,
      error: 'Error al crear el lote de neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  } finally {
    client.release();
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
       RETURNING id_neumatico_31, cod_neumatico_31, id_marca_31, id_estado_31, fecha_ingreso_31, observaciones_31`,
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
