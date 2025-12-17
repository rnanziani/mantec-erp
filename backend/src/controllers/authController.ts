import { Request, Response } from 'express';
import { pool } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  validarComplejidadPassword,
  verificarReutilizacionPassword,
  generarToken,
  verificarToken,
  verificarCuentaBloqueada,
  registrarIntentoLogin,
  actualizarUltimoLogin,
  verificarExpiracionPassword,
  obtenerIpCliente
} from '../utils/authUtils.js';
import { CreateUsuarioDTO, LoginDTO, ChangePasswordDTO } from '../types.js';

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, nombre_completo_00 }: CreateUsuarioDTO = req.body;

    // Validaciones básicas
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
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
      [username, email.toLowerCase(), passwordHash, nombre_completo_00 || null, true, fechaExpiracion]
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
      data: {
        id: nuevoUsuario.id_usuario_00,
        username: nuevoUsuario.username,
        email: nuevoUsuario.email,
        nombre_completo: nuevoUsuario.nombre_completo_00
      }
    });
  } catch (error: any) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar usuario',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginDTO = req.body;
    const ipAddress = obtenerIpCliente(req);

    // Validaciones básicas
    if (!email || !password) {
      await registrarIntentoLogin(email || '', false, undefined, ipAddress);
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // Verificar si la cuenta está bloqueada
    const bloqueo = await verificarCuentaBloqueada(email.toLowerCase());
    if (bloqueo.bloqueada) {
      return res.status(403).json({
        success: false,
        error: bloqueo.motivo
      });
    }

    // Buscar usuario por email
    const result = await pool.query(
      `SELECT id_usuario_00, username, email, password_hash, nombre_completo_00, 
              is_active, password_expires_at, last_password_change_at
       FROM tbl_00_usuario 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      await registrarIntentoLogin(email.toLowerCase(), false, undefined, ipAddress);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const usuario = result.rows[0];

    // Verificar si el usuario está activo
    if (!usuario.is_active) {
      await registrarIntentoLogin(email.toLowerCase(), false, usuario.id_usuario_00, ipAddress);
      return res.status(403).json({
        success: false,
        error: 'Cuenta desactivada'
      });
    }

    // Verificar contraseña
    const passwordValida = await verifyPassword(password, usuario.password_hash);
    if (!passwordValida) {
      await registrarIntentoLogin(email.toLowerCase(), false, usuario.id_usuario_00, ipAddress);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar expiración de contraseña
    const expiracion = verificarExpiracionPassword(new Date(usuario.password_expires_at));
    if (expiracion.expirada) {
      await registrarIntentoLogin(email.toLowerCase(), true, usuario.id_usuario_00, ipAddress);
      return res.status(403).json({
        success: false,
        error: 'Su contraseña ha expirado. Debe cambiarla antes de continuar.',
        requiereCambioPassword: true
      });
    }

    // Registrar intento exitoso
    await registrarIntentoLogin(email.toLowerCase(), true, usuario.id_usuario_00, ipAddress);

    // Actualizar último login
    await actualizarUltimoLogin(usuario.id_usuario_00);

    // Generar token
    const token = generarToken({
      id_usuario_00: usuario.id_usuario_00,
      username: usuario.username,
      email: usuario.email
    });

    // Crear sesión en base de datos
    const idSesion = `sesion_${usuario.id_usuario_00}_${Date.now()}`;
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 30); // 30 minutos

    await pool.query(
      `INSERT INTO tbl_03_sesion 
       (id_sesion_03, id_usuario_03, token_sesion_03, fecha_creacion_03, fecha_expiracion_03, ip_address_03, user_agent_03)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
      [idSesion, usuario.id_usuario_00, token, fechaExpiracion, ipAddress || null, req.headers['user-agent'] || null]
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id_usuario_00,
        username: usuario.username,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo_00
      },
      passwordExpiresIn: expiracion.diasRestantes ? `${expiracion.diasRestantes} días` : null
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    // Verificar token
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

    const { password_actual, password_nueva }: ChangePasswordDTO = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña actual y nueva son requeridas'
      });
    }

    // Obtener usuario
    const result = await pool.query(
      `SELECT id_usuario_00, password_hash FROM tbl_00_usuario WHERE id_usuario_00 = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña actual
    const passwordValida = await verifyPassword(password_actual, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Validar complejidad de nueva contraseña
    const validacion = validarComplejidadPassword(password_nueva);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        error: validacion.errores.join(', ')
      });
    }

    // Verificar reutilización
    const esReutilizada = await verificarReutilizacionPassword(usuario.id_usuario_00, password_nueva);
    if (esReutilizada) {
      return res.status(400).json({
        success: false,
        error: 'No puede reutilizar contraseñas anteriores. Por favor, elija una nueva.'
      });
    }

    // Hashear nueva contraseña
    const nuevoHash = await hashPassword(password_nueva);

    // Guardar contraseña actual en historial
    await pool.query(
      `INSERT INTO tbl_01_historial_contrasena 
       (id_usuario_01, hashed_password_01, fecha_cambio_01)
       VALUES ($1, $2, NOW())`,
      [usuario.id_usuario_00, usuario.password_hash]
    );

    // Calcular nueva fecha de expiración (91 días)
    const nuevaFechaExpiracion = new Date();
    nuevaFechaExpiracion.setDate(nuevaFechaExpiracion.getDate() + 91);

    // Actualizar contraseña
    await pool.query(
      `UPDATE tbl_00_usuario 
       SET password_hash = $1, 
           last_password_change_at = NOW(),
           password_expires_at = $2
       WHERE id_usuario_00 = $3`,
      [nuevoHash, nuevaFechaExpiracion, usuario.id_usuario_00]
    );

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente. La nueva contraseña caducará en 91 días.'
    });
  } catch (error: any) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar contraseña',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario actual
 * @access  Private
 */
export const getMe = async (req: Request, res: Response) => {
  try {
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

    const result = await pool.query(
      `SELECT id_usuario_00, username, email, nombre_completo_00, is_active, 
              password_expires_at, last_login_at, created_at
       FROM tbl_00_usuario 
       WHERE id_usuario_00 = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = result.rows[0];
    const expiracion = verificarExpiracionPassword(new Date(usuario.password_expires_at));

    res.json({
      success: true,
      data: {
        id: usuario.id_usuario_00,
        username: usuario.username,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo_00,
        is_active: usuario.is_active,
        passwordExpiresIn: expiracion.diasRestantes ? `${expiracion.diasRestantes} días` : null,
        passwordExpired: expiracion.expirada,
        last_login: usuario.last_login_at
      }
    });
  } catch (error: any) {
    console.error('Error en getMe:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del usuario',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // Eliminar sesión de la base de datos
      await pool.query(
        `DELETE FROM tbl_03_sesion WHERE token_sesion_03 = $1`,
        [token]
      );
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error: any) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión',
      details: error.message
    });
  }
};











