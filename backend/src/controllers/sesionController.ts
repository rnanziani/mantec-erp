import { Request, Response } from 'express';
import { pool } from '../db.js';

/**
 * @route   GET /api/sesiones
 * @desc    Obtener todas las sesiones activas
 * @access  Private
 */
export const getAllSesiones = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.id_sesion_03,
        s.id_usuario_03,
        s.fecha_creacion_03,
        s.fecha_expiracion_03,
        s.ip_address_03,
        s.user_agent_03,
        u.username,
        u.email,
        u.nombre_completo_00,
        CASE 
          WHEN s.fecha_expiracion_03 > NOW() THEN true 
          ELSE false 
        END as activa
       FROM tbl_03_sesion s
       INNER JOIN tbl_00_usuario u ON s.id_usuario_03 = u.id_usuario_00
       ORDER BY s.fecha_creacion_03 DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sesiones',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/sesiones/:id
 * @desc    Cerrar una sesión específica
 * @access  Private
 */
export const cerrarSesion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM tbl_03_sesion 
       WHERE id_sesion_03 = $1
       RETURNING id_sesion_03`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error: any) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/sesiones/usuario/:id
 * @desc    Cerrar todas las sesiones de un usuario
 * @access  Private
 */
export const cerrarTodasSesionesUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM tbl_03_sesion 
       WHERE id_usuario_03 = $1
       RETURNING id_sesion_03`,
      [id]
    );

    res.json({
      success: true,
      message: `${result.rows.length} sesión(es) cerrada(s) exitosamente`,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error al cerrar sesiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesiones',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/intentos-login
 * @desc    Obtener todos los intentos de login (auditoría)
 * @access  Private
 */
export const getAllIntentosLogin = async (req: Request, res: Response) => {
  try {
    const { limit = '100', exitoso } = req.query;

    let query = `
      SELECT 
        i.id_intento_02,
        i.id_usuario_02,
        i.attempted_email,
        i.ip_address_02,
        i.exitoso_02,
        i.fecha_intento_02,
        u.username,
        u.nombre_completo_00
       FROM tbl_02_intento_login i
       LEFT JOIN tbl_00_usuario u ON i.id_usuario_02 = u.id_usuario_00
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (exitoso !== undefined) {
      query += ` WHERE i.exitoso_02 = $${paramIndex++}`;
      params.push(exitoso === 'true');
    }

    query += ` ORDER BY i.fecha_intento_02 DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error al obtener intentos de login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener intentos de login',
      details: error.message
    });
  }
};











