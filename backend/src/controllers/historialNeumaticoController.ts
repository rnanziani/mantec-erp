import { Request, Response } from 'express';
import { pool } from '../db.js';
import { HistorialNeumatico } from '../types.js';

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

function escrituraConsultaOnly(_req: Request, res: Response): void {
  res.status(405).json({
    success: false,
    error: 'El historial es de solo consulta. Registre movimientos en Trazabilidad.',
  });
}

export const createHistorial = async (req: Request, res: Response): Promise<void> => {
  escrituraConsultaOnly(req, res);
};

export const updateHistorial = async (req: Request, res: Response): Promise<void> => {
  escrituraConsultaOnly(req, res);
};

export const deleteHistorial = async (req: Request, res: Response): Promise<void> => {
  escrituraConsultaOnly(req, res);
};
