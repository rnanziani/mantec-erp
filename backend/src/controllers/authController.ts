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
import { CreateUsuarioDTO, LoginDTO, ChangePasswordDTO, ChangePasswordExpiredDTO } from '../types.js';

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

    // Calcular fecha de expiración desde parámetros del sistema
    const { obtenerParametroNumero } = await import('../utils/parametrosUtils.js');
    const diasExpiracion = await obtenerParametroNumero('PASSWORD_EXPIRATION_DAYS', 91);
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + diasExpiracion);

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
    const token = await generarToken({
      id_usuario_00: usuario.id_usuario_00,
      username: usuario.username,
      email: usuario.email
    });

    // Crear sesión en base de datos con tiempo configurable
    const { obtenerTiempoSesionSegundos, invalidarCacheParametros } = await import('../utils/parametrosUtils.js');
    invalidarCacheParametros(); // Leer SESSION_TIMEOUT_SECONDS fresco al crear sesión
    const segundosSesion = await obtenerTiempoSesionSegundos(30 * 60);
    console.log('[Login] Sesión creada con expiración en', segundosSesion, 'segundos');
    const idSesion = `sesion_${usuario.id_usuario_00}_${Date.now()}`;
    const fechaExpiracion = new Date();
    fechaExpiracion.setSeconds(fechaExpiracion.getSeconds() + segundosSesion);

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
 * @route   POST /api/auth/change-password-expired
 * @desc    Cambiar contraseña cuando está expirada (sin token, desde login)
 * @access  Public
 */
export const changePasswordExpired = async (req: Request, res: Response) => {
  try {
    const { email, password_actual, password_nueva }: ChangePasswordExpiredDTO = req.body;

    if (!email || !password_actual || !password_nueva) {
      return res.status(400).json({
        success: false,
        error: 'Email, contraseña actual y nueva son requeridas'
      });
    }

    const result = await pool.query(
      `SELECT id_usuario_00, password_hash, password_expires_at FROM tbl_00_usuario 
       WHERE LOWER(email) = LOWER($1) AND is_active = true`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const usuario = result.rows[0];

    const passwordValida = await verifyPassword(password_actual, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    const expiracion = verificarExpiracionPassword(new Date(usuario.password_expires_at));
    if (!expiracion.expirada) {
      return res.status(400).json({
        success: false,
        error: 'Su contraseña no ha expirado. Use la opción "Cambiar contraseña" dentro del sistema.'
      });
    }

    const validacion = validarComplejidadPassword(password_nueva);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        error: validacion.errores.join(', ')
      });
    }

    const esReutilizada = await verificarReutilizacionPassword(usuario.id_usuario_00, password_nueva);
    if (esReutilizada) {
      return res.status(400).json({
        success: false,
        error: 'No puede reutilizar contraseñas anteriores. Por favor, elija una nueva.'
      });
    }

    const nuevoHash = await hashPassword(password_nueva);

    await pool.query(
      `INSERT INTO tbl_01_historial_contrasena 
       (id_usuario_01, hashed_password_01, fecha_cambio_01)
       VALUES ($1, $2, NOW())`,
      [usuario.id_usuario_00, usuario.password_hash]
    );

    const { obtenerParametroNumero } = await import('../utils/parametrosUtils.js');
    const diasExpiracion = await obtenerParametroNumero('PASSWORD_EXPIRATION_DAYS', 91);
    const nuevaFechaExpiracion = new Date();
    nuevaFechaExpiracion.setDate(nuevaFechaExpiracion.getDate() + diasExpiracion);

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
      message: 'Contraseña actualizada. Ya puede iniciar sesión con su nueva contraseña.'
    });
  } catch (error: any) {
    console.error('Error en changePasswordExpired:', error);
    return res.status(500).json({
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

    // No extender sesión aquí: la expiración se controla por SESSION_TIMEOUT_SECONDS
    // y solo se extiende explícitamente con POST /api/auth/extend-session

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
 * @route   GET /api/auth/permissions
 * @desc    Obtener permisos del usuario actual basados en su nivel
 * @access  Private
 */
export const getMyPermissions = async (req: Request, res: Response) => {
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

    // Obtener el usuario y su nivel
    const usuarioResult = await pool.query(
      `SELECT id_usuario_00, id_nivel_04 
       FROM tbl_00_usuario 
       WHERE id_usuario_00 = $1`,
      [decoded.id]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = usuarioResult.rows[0];
    const idNivel = usuario.id_nivel_04;
    const idUsuario = usuario.id_usuario_00;

    // Obtener los permisos del usuario: combinación de permisos del nivel + permisos directos
    // Si el usuario no tiene nivel, solo se obtienen los permisos directos
    let permisosResult;
    
    if (idNivel) {
      // Usuario con nivel: permisos del nivel + permisos directos
      permisosResult = await pool.query(
        `SELECT DISTINCT
          p.id_permiso_05,
          p.nombre_permiso_05,
          p.descripcion_05,
          p.orden_05,
          COALESCE(p.orden_05, 9999) AS orden_para_sort
         FROM tbl_05_permiso p
         WHERE p.id_permiso_05 IN (
           -- Permisos del nivel del usuario
           SELECT np.id_permiso_05
           FROM tbl_050_nivel_permiso np
           WHERE np.id_nivel_04 = $1
           
           UNION
           
           -- Permisos directos del usuario
           SELECT up.id_permiso_000
           FROM tbl_000_usuario_permiso up
           WHERE up.id_usuario_000 = $2
         )
         ORDER BY orden_para_sort ASC, p.nombre_permiso_05 ASC`,
        [idNivel, idUsuario]
      );
    } else {
      // Usuario sin nivel: solo permisos directos
      permisosResult = await pool.query(
        `SELECT DISTINCT
          p.id_permiso_05,
          p.nombre_permiso_05,
          p.descripcion_05,
          p.orden_05,
          COALESCE(p.orden_05, 9999) AS orden_para_sort
         FROM tbl_05_permiso p
         INNER JOIN tbl_000_usuario_permiso up ON p.id_permiso_05 = up.id_permiso_000
         WHERE up.id_usuario_000 = $1
         ORDER BY orden_para_sort ASC, p.nombre_permiso_05 ASC`,
        [idUsuario]
      );
    }

    const permissions = permisosResult.rows;
    const permissionNames = permissions.map((p: any) => p.nombre_permiso_05);

    res.json({
      success: true,
      data: {
        permissions,
        permissionNames
      }
    });
  } catch (error: any) {
    console.error('Error en getMyPermissions:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener permisos del usuario',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/auth/session-status
 * @desc    Obtener estado de la sesión actual (tiempo restante)
 * @access  Private
 */
export const getSessionStatus = async (req: Request, res: Response) => {
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
        error: 'Token inválido o expirado',
        sessionExpired: true
      });
    }

    // Obtener información de la sesión actual
    const sesionResult = await pool.query(
      `SELECT fecha_expiracion_03, fecha_creacion_03
       FROM tbl_03_sesion 
       WHERE token_sesion_03 = $1 AND fecha_expiracion_03 > NOW()
       ORDER BY fecha_creacion_03 DESC
       LIMIT 1`,
      [token]
    );

    if (sesionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Sesión expirada o no encontrada',
        sessionExpired: true
      });
    }

    const sesion = sesionResult.rows[0];
    const fechaExpiracion = new Date(sesion.fecha_expiracion_03);
    const ahora = new Date();
    const tiempoRestante = fechaExpiracion.getTime() - ahora.getTime();
    const minutosRestantes = Math.max(0, Math.floor(tiempoRestante / (1000 * 60)));
    const segundosRestantes = Math.max(0, Math.floor((tiempoRestante % (1000 * 60)) / 1000));

    // Obtener parámetro de minutos de advertencia
    const { obtenerParametroNumero } = await import('../utils/parametrosUtils.js');
    const minutosAdvertencia = await obtenerParametroNumero('SESSION_WARNING_MINUTES', 5);
    
    // Calcular segundos totales restantes
    const segundosTotalesRestantes = minutosRestantes * 60 + segundosRestantes;
    
    // Advertir si quedan menos minutos que el parámetro, O si quedan 30 segundos o menos (siempre)
    const debeAdvertir = (minutosRestantes <= minutosAdvertencia && minutosRestantes > 0) || segundosTotalesRestantes <= 30;

    // Obtener días restantes de contraseña para aviso de caducidad (5 días antes)
    let diasRestantesPassword: number | undefined;
    let passwordExpired = false;
    const userResult = await pool.query(
      'SELECT password_expires_at FROM tbl_00_usuario WHERE id_usuario_00 = $1',
      [decoded.id]
    );
    if (userResult.rows.length > 0) {
      const expiracionPwd = verificarExpiracionPassword(new Date(userResult.rows[0].password_expires_at));
      passwordExpired = expiracionPwd.expirada;
      diasRestantesPassword = expiracionPwd.diasRestantes;
    }

    res.json({
      success: true,
      data: {
        sessionExpired: tiempoRestante <= 0,
        minutosRestantes,
        segundosRestantes,
        fechaExpiracion: fechaExpiracion.toISOString(),
        debeAdvertir,
        minutosAdvertencia,
        diasRestantesPassword,
        passwordExpired
      }
    });
  } catch (error: any) {
    console.error('Error en getSessionStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado de sesión',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/auth/extend-session
 * @desc    Extender la sesión actual
 * @access  Private
 */
export const extendSession = async (req: Request, res: Response) => {
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

    // Obtener tiempo de sesión desde parámetros
    const { obtenerTiempoSesionSegundos } = await import('../utils/parametrosUtils.js');
    const segundosSesion = await obtenerTiempoSesionSegundos(30 * 60);
    // Añadir buffer del countdown para que la sesión siga válida cuando el usuario pulse "Reactivar"
    const countdownBuffer = Math.min(30, Math.max(5, Math.floor(segundosSesion / 2)));
    const segundosTotales = segundosSesion + countdownBuffer;
    const nuevaFechaExpiracion = new Date();
    nuevaFechaExpiracion.setSeconds(nuevaFechaExpiracion.getSeconds() + segundosTotales);

    // Actualizar sesión por token (permite "resucitar" sesiones expiradas al reactivar)
    const result = await pool.query(
      `UPDATE tbl_03_sesion 
       SET fecha_expiracion_03 = $1 
       WHERE token_sesion_03 = $2
       RETURNING fecha_expiracion_03`,
      [nuevaFechaExpiracion, token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sesión extendida exitosamente',
      data: {
        nuevaFechaExpiracion: nuevaFechaExpiracion.toISOString(),
        segundosSesion: segundosTotales
      }
    });
  } catch (error: any) {
    console.error('Error al extender sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al extender sesión',
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

















