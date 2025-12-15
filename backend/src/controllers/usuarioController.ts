import { Request, Response } from 'express';
import { pool } from '../db.js';
import { hashPassword, validarComplejidadPassword } from '../utils/authUtils.js';

/**
 * @route   GET /api/usuarios
 * @desc    Obtener todos los usuarios
 * @access  Private (requiere autenticación)
 */
export const getAllUsuarios = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id_usuario_00,
        username,
        email,
        nombre_completo_00,
        is_active,
        password_expires_at,
        last_password_change_at,
        last_login_at,
        created_at,
        updated_at
       FROM tbl_00_usuario
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener un usuario por ID
 * @access  Private
 */
export const getUsuarioById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id_usuario_00,
        username,
        email,
        nombre_completo_00,
        is_active,
        password_expires_at,
        last_password_change_at,
        last_login_at,
        created_at,
        updated_at
       FROM tbl_00_usuario
       WHERE id_usuario_00 = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/usuarios
 * @desc    Crear un nuevo usuario
 * @access  Private
 */
export const createUsuario = async (req: Request, res: Response) => {
  try {
    const { username, email, password, nombre_completo_00, is_active } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email y password son requeridos'
      });
    }

    // Validar complejidad de contraseña
    const validacion = validarComplejidadPassword(password);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        error: validacion.errores.join(', ')
      });
    }

    // Verificar si el usuario o email ya existe
    const usuarioExistente = await pool.query(
      `SELECT id_usuario_00 FROM tbl_00_usuario 
       WHERE username = $1 OR email = $2`,
      [username, email.toLowerCase()]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario o email ya está en uso'
      });
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password);

    // Calcular fecha de expiración (91 días)
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 91);

    // Crear usuario
    const result = await pool.query(
      `INSERT INTO tbl_00_usuario 
       (username, email, password_hash, nombre_completo_00, is_active, password_expires_at, last_password_change_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id_usuario_00, username, email, nombre_completo_00, is_active, created_at`,
      [username, email.toLowerCase(), passwordHash, nombre_completo_00 || null, is_active !== undefined ? is_active : true, fechaExpiracion]
    );

    const nuevoUsuario = result.rows[0];

    // Guardar contraseña en historial
    await pool.query(
      `INSERT INTO tbl_01_historial_contrasena 
       (id_usuario_01, hashed_password_01, fecha_cambio_01)
       VALUES ($1, $2, NOW())`,
      [nuevoUsuario.id_usuario_00, passwordHash]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: nuevoUsuario
    });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear usuario',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar un usuario
 * @access  Private
 */
export const updateUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, nombre_completo_00, is_active } = req.body;

    // Verificar si el usuario existe
    const usuarioExistente = await pool.query(
      `SELECT id_usuario_00 FROM tbl_00_usuario WHERE id_usuario_00 = $1`,
      [id]
    );

    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el username o email ya están en uso por otro usuario
    if (username || email) {
      const conflictCheck = await pool.query(
        `SELECT id_usuario_00 FROM tbl_00_usuario 
         WHERE (username = $1 OR email = $2) AND id_usuario_00 != $3`,
        [username || '', email ? email.toLowerCase() : '', id]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario o email ya está en uso por otro usuario'
        });
      }
    }

    // Construir query dinámico
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.toLowerCase());
    }
    if (nombre_completo_00 !== undefined) {
      updates.push(`nombre_completo_00 = $${paramIndex++}`);
      values.push(nombre_completo_00 || null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE tbl_00_usuario 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id_usuario_00 = $${paramIndex}
       RETURNING id_usuario_00, username, email, nombre_completo_00, is_active, 
                 password_expires_at, last_password_change_at, last_login_at, created_at, updated_at`,
      values
    );

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar un usuario
 * @access  Private
 */
export const deleteUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const usuarioExistente = await pool.query(
      `SELECT id_usuario_00 FROM tbl_00_usuario WHERE id_usuario_00 = $1`,
      [id]
    );

    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Eliminar usuario (las relaciones CASCADE eliminarán historial y sesiones)
    await pool.query(
      `DELETE FROM tbl_00_usuario WHERE id_usuario_00 = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/usuarios/:id/historial-contrasenas
 * @desc    Obtener historial de contraseñas de un usuario
 * @access  Private
 */
export const getHistorialContrasenas = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        h.id_historial_01,
        h.id_usuario_01,
        h.fecha_cambio_01,
        u.username,
        u.email
       FROM tbl_01_historial_contrasena h
       INNER JOIN tbl_00_usuario u ON h.id_usuario_01 = u.id_usuario_00
       WHERE h.id_usuario_01 = $1
       ORDER BY h.fecha_cambio_01 DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error al obtener historial de contraseñas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de contraseñas',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/usuarios/:id/intentos-login
 * @desc    Obtener intentos de login de un usuario
 * @access  Private
 */
export const getIntentosLogin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50' } = req.query;

    const result = await pool.query(
      `SELECT 
        i.id_intento_02,
        i.id_usuario_02,
        i.attempted_email,
        i.ip_address_02,
        i.exitoso_02,
        i.fecha_intento_02,
        u.username
       FROM tbl_02_intento_login i
       LEFT JOIN tbl_00_usuario u ON i.id_usuario_02 = u.id_usuario_00
       WHERE i.id_usuario_02 = $1 OR i.attempted_email = (SELECT email FROM tbl_00_usuario WHERE id_usuario_00 = $1)
       ORDER BY i.fecha_intento_02 DESC
       LIMIT $2`,
      [id, parseInt(limit as string)]
    );

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

/**
 * @route   GET /api/usuarios/:id/sesiones
 * @desc    Obtener sesiones activas de un usuario
 * @access  Private
 */
export const getSesionesUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
        CASE 
          WHEN s.fecha_expiracion_03 > NOW() THEN true 
          ELSE false 
        END as activa
       FROM tbl_03_sesion s
       INNER JOIN tbl_00_usuario u ON s.id_usuario_03 = u.id_usuario_00
       WHERE s.id_usuario_03 = $1
       ORDER BY s.fecha_creacion_03 DESC`,
      [id]
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





