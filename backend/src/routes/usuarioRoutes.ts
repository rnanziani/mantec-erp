import { Router } from 'express';
import {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getHistorialContrasenas,
  getIntentosLogin,
  getSesionesUsuario
} from '../controllers/usuarioController.js';

const router = Router();

/**
 * @route   GET /api/usuarios
 * @desc    Obtener todos los usuarios
 * @access  Private
 */
router.get('/', getAllUsuarios);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener un usuario por ID
 * @access  Private
 */
router.get('/:id', getUsuarioById);

/**
 * @route   GET /api/usuarios/:id/historial-contrasenas
 * @desc    Obtener historial de contraseñas de un usuario
 * @access  Private
 */
router.get('/:id/historial-contrasenas', getHistorialContrasenas);

/**
 * @route   GET /api/usuarios/:id/intentos-login
 * @desc    Obtener intentos de login de un usuario
 * @access  Private
 */
router.get('/:id/intentos-login', getIntentosLogin);

/**
 * @route   GET /api/usuarios/:id/sesiones
 * @desc    Obtener sesiones de un usuario
 * @access  Private
 */
router.get('/:id/sesiones', getSesionesUsuario);

/**
 * @route   POST /api/usuarios
 * @desc    Crear un nuevo usuario
 * @access  Private
 */
router.post('/', createUsuario);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar un usuario
 * @access  Private
 */
router.put('/:id', updateUsuario);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar un usuario
 * @access  Private
 */
router.delete('/:id', deleteUsuario);

export default router;











