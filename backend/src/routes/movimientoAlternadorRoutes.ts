import { Router } from 'express';
import {
  getAllMovimientos,
  getMovimientoById,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento
} from '../controllers/movimientoAlternadorController.js';

const router = Router();

/**
 * @route   GET /api/movimientos
 * @desc    Obtener todos los movimientos de alternador
 * @access  Public
 */
router.get('/', getAllMovimientos);

/**
 * @route   GET /api/movimientos/:id
 * @desc    Obtener un movimiento por ID
 * @access  Public
 */
router.get('/:id', getMovimientoById);

/**
 * @route   POST /api/movimientos
 * @desc    Crear un nuevo movimiento
 * @access  Public
 */
router.post('/', createMovimiento);

/**
 * @route   PUT /api/movimientos/:id
 * @desc    Actualizar un movimiento existente
 * @access  Public
 */
router.put('/:id', updateMovimiento);

/**
 * @route   DELETE /api/movimientos/:id
 * @desc    Eliminar un movimiento
 * @access  Public
 */
router.delete('/:id', deleteMovimiento);

export default router;
