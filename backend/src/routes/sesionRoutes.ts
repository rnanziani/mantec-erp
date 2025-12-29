import { Router } from 'express';
import {
  getAllSesiones,
  cerrarSesion,
  cerrarTodasSesionesUsuario,
  getAllIntentosLogin
} from '../controllers/sesionController.js';

const router = Router();

/**
 * @route   GET /api/sesiones
 * @desc    Obtener todas las sesiones activas
 * @access  Private
 */
router.get('/', getAllSesiones);

/**
 * @route   GET /api/intentos-login
 * @desc    Obtener todos los intentos de login (auditoría)
 * @access  Private
 */
router.get('/intentos-login', getAllIntentosLogin);

/**
 * @route   DELETE /api/sesiones/:id
 * @desc    Cerrar una sesión específica
 * @access  Private
 */
router.delete('/:id', cerrarSesion);

/**
 * @route   DELETE /api/sesiones/usuario/:id
 * @desc    Cerrar todas las sesiones de un usuario
 * @access  Private
 */
router.delete('/usuario/:id', cerrarTodasSesionesUsuario);

export default router;










































