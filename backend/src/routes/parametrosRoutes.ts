import { Router } from 'express';
import {
  getAllParametros,
  getParametroByCodigo,
  updateParametro,
  getValoresActuales
} from '../controllers/parametrosController.js';

const router = Router();

/**
 * @route   GET /api/parametros
 * @desc    Obtener todos los parámetros del sistema
 * @access  Private
 */
router.get('/', getAllParametros);

/**
 * @route   GET /api/parametros/valores/actuales
 * @desc    Obtener valores actuales de parámetros importantes
 * @access  Private
 */
router.get('/valores/actuales', getValoresActuales);

/**
 * @route   GET /api/parametros/:codigo
 * @desc    Obtener un parámetro por código
 * @access  Private
 */
router.get('/:codigo', getParametroByCodigo);

/**
 * @route   PUT /api/parametros/:id
 * @desc    Actualizar un parámetro del sistema
 * @access  Private (requiere permisos de administrador)
 */
router.put('/:id', updateParametro);

export default router;







