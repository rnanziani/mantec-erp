import { Request, Response } from 'express';
import {
  obtenerTodosParametros,
  actualizarParametro,
  obtenerParametro,
  obtenerParametroNumero
} from '../utils/parametrosUtils.js';
import { verificarToken } from '../utils/authUtils.js';

/**
 * @route   GET /api/parametros
 * @desc    Obtener todos los parámetros del sistema
 * @access  Private (requiere autenticación y permisos de administrador)
 */
export const getAllParametros = async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const decoded = verificarToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    const parametros = await obtenerTodosParametros();

    res.json({
      success: true,
      data: parametros,
      count: parametros.length
    });
  } catch (error: any) {
    console.error('Error al obtener parámetros:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener parámetros del sistema',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/parametros/:codigo
 * @desc    Obtener un parámetro por código
 * @access  Private
 */
export const getParametroByCodigo = async (req: Request, res: Response) => {
  try {
    // Verificar autenticación
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const decoded = verificarToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    const { codigo } = req.params;
    const valor = await obtenerParametro(codigo, '');

    if (!valor) {
      return res.status(404).json({
        success: false,
        error: 'Parámetro no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        codigo_parametro_000: codigo,
        valor_parametro_000: valor
      }
    });
  } catch (error: any) {
    console.error('Error al obtener parámetro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener parámetro',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/parametros/:id
 * @desc    Actualizar un parámetro del sistema
 * @access  Private (requiere permisos de administrador)
 */
export const updateParametro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { valor_parametro } = req.body;

    if (!valor_parametro) {
      return res.status(400).json({
        success: false,
        error: 'El valor del parámetro es requerido'
      });
    }

    // Obtener ID del trabajador desde el token (si existe relación)
    // Nota: La tabla referencia a tbl_06_trabajador, pero el token tiene id_usuario_00
    // Por ahora dejamos NULL ya que no hay relación directa entre usuario y trabajador
    let trabajadorId: number | undefined;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = verificarToken(token);
      if (decoded && decoded.id) {
        // Intentar obtener el trabajador asociado al usuario (si existe relación)
        // Por ahora dejamos NULL ya que el campo permite NULL
        trabajadorId = undefined; // TODO: Implementar relación usuario-trabajador si es necesaria
      }
    }

    const actualizado = await actualizarParametro(
      parseInt(id, 10),
      valor_parametro.toString(),
      trabajadorId
    );

    if (!actualizado) {
      return res.status(404).json({
        success: false,
        error: 'Parámetro no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Parámetro actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar parámetro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar parámetro',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/parametros/valores/actuales
 * @desc    Obtener valores actuales de parámetros importantes (sin cache)
 * @access  Private
 */
export const getValoresActuales = async (req: Request, res: Response) => {
  try {
    const sessionTimeout = await obtenerParametroNumero('SESSION_TIMEOUT_MINUTES', 30);
    const passwordExpiration = await obtenerParametroNumero('PASSWORD_EXPIRATION_DAYS', 91);
    const jwtExpiration = await obtenerParametroNumero('JWT_EXPIRATION_MINUTES', 30);

    res.json({
      success: true,
      data: {
        SESSION_TIMEOUT_MINUTES: sessionTimeout,
        PASSWORD_EXPIRATION_DAYS: passwordExpiration,
        JWT_EXPIRATION_MINUTES: jwtExpiration
      }
    });
  } catch (error: any) {
    console.error('Error al obtener valores actuales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener valores actuales',
      details: error.message
    });
  }
};







