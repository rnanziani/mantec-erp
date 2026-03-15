import { Router } from 'express';
import {
  register,
  login,
  changePassword,
  changePasswordExpired,
  getMe,
  getMyPermissions,
  getSessionStatus,
  extendSession,
  logout
} from '../controllers/authController.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.post('/change-password', changePassword);

/**
 * @route   POST /api/auth/change-password-expired
 * @desc    Cambiar contraseña cuando está expirada (desde login, sin token)
 * @access  Public
 */
router.post('/change-password-expired', changePasswordExpired);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener información del usuario actual
 * @access  Private
 */
router.get('/me', getMe);

/**
 * @route   GET /api/auth/permissions
 * @desc    Obtener permisos del usuario actual
 * @access  Private
 */
router.get('/permissions', getMyPermissions);

/**
 * @route   GET /api/auth/session-status
 * @desc    Obtener estado de la sesión actual (tiempo restante)
 * @access  Private
 */
router.get('/session-status', getSessionStatus);

/**
 * @route   POST /api/auth/extend-session
 * @desc    Extender la sesión actual
 * @access  Private
 */
router.post('/extend-session', extendSession);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', logout);

export default router;




















