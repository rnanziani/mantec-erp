import { Request, Response } from 'express';
import { pool } from '../db.js';
import { HistorialNeumatico, CreateHistorialNeumaticoDTO, UpdateHistorialNeumaticoDTO } from '../types.js';

/**
 * Obtener todos los registros del historial de neumáticos
 */
export const getAllHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<HistorialNeumatico>(
      `SELECT 
        h.id_historial_34,
        h.cod_neumatico_34,
        h.id_conductor_34,
        h.id_maquina_34,
        h.kilometraje_34,
        h.id_tecnico_34,
        h.balanceo_34,
        h.fecha_movimiento_34,
        h.observaciones_34,
        c.nombre_06 || ' ' || COALESCE(c.apaterno_06, '') || ' ' || COALESCE(c.amaterno_06, '') as conductor_nombre,
        m.numinterno_11 as maquina_numinterno,
        m.ppu_11 as maquina_ppu,
        t.nombres_21 || ' ' || COALESCE(t.a_paterno_21, '') || ' ' || COALESCE(t.a_materno_21, '') as tecnico_nombre
       FROM tbl_34_historial_neumatico h
       LEFT JOIN tbl_06_trabajador c ON h.id_conductor_34 = c.idtrabajador_06
       LEFT JOIN tbl_11_maquina m ON h.id_maquina_34 = m.idmaquina_11
       LEFT JOIN tbl_21_tecnico t ON h.id_tecnico_34 = t.id_tecnico_21
       ORDER BY h.fecha_movimiento_34 DESC, h.id_historial_34 DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el historial de neumáticos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener un registro por ID
 */
export const getHistorialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query<HistorialNeumatico>(
      `SELECT 
        h.id_historial_34,
        h.cod_neumatico_34,
        h.id_conductor_34,
        h.id_maquina_34,
        h.kilometraje_34,
        h.id_tecnico_34,
        h.balanceo_34,
        h.fecha_movimiento_34,
        h.observaciones_34
       FROM tbl_34_historial_neumatico h
       WHERE h.id_historial_34 = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el registro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear un nuevo registro
 */
export const createHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cod_neumatico_34, id_conductor_34, id_maquina_34, kilometraje_34, id_tecnico_34, balanceo_34, fecha_movimiento_34, observaciones_34 }: CreateHistorialNeumaticoDTO = req.body;

    if (!cod_neumatico_34 || cod_neumatico_34.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El código del neumático es requerido'
      });
      return;
    }

    const neumaticoExists = await pool.query(
      'SELECT cod_neumatico_31 FROM tbl_31_neumatico WHERE cod_neumatico_31 = $1',
      [cod_neumatico_34.trim().toUpperCase()]
    );

    if (neumaticoExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'El neumático indicado no existe'
      });
      return;
    }

    const fechaMov = fecha_movimiento_34 ? new Date(fecha_movimiento_34).toISOString() : new Date().toISOString();
    const kilometraje = kilometraje_34 != null && !isNaN(Number(kilometraje_34)) ? Number(kilometraje_34) : null;
    const balanceo = balanceo_34 === true;
    const idConductor = id_conductor_34 && !isNaN(Number(id_conductor_34)) ? Number(id_conductor_34) : null;
    const idMaquina = id_maquina_34 && !isNaN(Number(id_maquina_34)) ? Number(id_maquina_34) : null;
    const idTecnico = id_tecnico_34 && !isNaN(Number(id_tecnico_34)) ? Number(id_tecnico_34) : null;

    const result = await pool.query<HistorialNeumatico>(
      `INSERT INTO tbl_34_historial_neumatico 
       (cod_neumatico_34, id_conductor_34, id_maquina_34, kilometraje_34, id_tecnico_34, balanceo_34, fecha_movimiento_34, observaciones_34)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [cod_neumatico_34.trim().toUpperCase(), idConductor, idMaquina, kilometraje, idTecnico, balanceo, fechaMov, observaciones_34?.trim() || null]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Registro creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el registro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar un registro existente
 */
export const updateHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cod_neumatico_34, id_conductor_34, id_maquina_34, kilometraje_34, id_tecnico_34, balanceo_34, fecha_movimiento_34, observaciones_34 }: UpdateHistorialNeumaticoDTO = req.body;

    if (!cod_neumatico_34 || cod_neumatico_34.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El código del neumático es requerido'
      });
      return;
    }

    const neumaticoExists = await pool.query(
      'SELECT cod_neumatico_31 FROM tbl_31_neumatico WHERE cod_neumatico_31 = $1',
      [cod_neumatico_34.trim().toUpperCase()]
    );

    if (neumaticoExists.rowCount === 0) {
      res.status(400).json({
        success: false,
        error: 'El neumático indicado no existe'
      });
      return;
    }

    const fechaMov = fecha_movimiento_34 ? new Date(fecha_movimiento_34).toISOString() : new Date().toISOString();
    const kilometraje = kilometraje_34 != null && !isNaN(Number(kilometraje_34)) ? Number(kilometraje_34) : null;
    const balanceo = balanceo_34 === true;
    const idConductor = id_conductor_34 && !isNaN(Number(id_conductor_34)) ? Number(id_conductor_34) : null;
    const idMaquina = id_maquina_34 && !isNaN(Number(id_maquina_34)) ? Number(id_maquina_34) : null;
    const idTecnico = id_tecnico_34 && !isNaN(Number(id_tecnico_34)) ? Number(id_tecnico_34) : null;

    const result = await pool.query<HistorialNeumatico>(
      `UPDATE tbl_34_historial_neumatico
       SET cod_neumatico_34 = $1, id_conductor_34 = $2, id_maquina_34 = $3, kilometraje_34 = $4, id_tecnico_34 = $5, 
           balanceo_34 = $6, fecha_movimiento_34 = $7, observaciones_34 = $8
       WHERE id_historial_34 = $9 RETURNING *`,
      [cod_neumatico_34.trim().toUpperCase(), idConductor, idMaquina, kilometraje, idTecnico, balanceo, fechaMov, observaciones_34?.trim() || null, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Registro actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el registro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar un registro
 */
export const deleteHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tbl_34_historial_neumatico WHERE id_historial_34 = $1 RETURNING id_historial_34',
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Registro eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el registro',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
