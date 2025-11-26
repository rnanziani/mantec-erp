import { Router } from 'express';
import {
  getAllEstados,
  getEstadoById,
  createEstado,
  updateEstado,
  deleteEstado
} from '../controllers/estadoAlternadorController.js';

const router = Router();

/**
 * @route   GET /api/estados
 * @desc    Obtener todos los estados de alternador
 * @access  Public
 */
router.get('/', getAllEstados);

/**
 * @route   GET /api/estados/:id
 * @desc    Obtener un estado por ID
 * @access  Public
 */
router.get('/:id', getEstadoById);

/**
 * @route   POST /api/estados
 * @desc    Crear un nuevo estado
 * @access  Public
 */
router.post('/', createEstado);

/**
 * @route   PUT /api/estados/:id
 * @desc    Actualizar un estado existente
 * @access  Public
 */
router.put('/:id', updateEstado);

/**
 * @route   DELETE /api/estados/:id
 * @desc    Eliminar un estado
 * @access  Public
 */
router.delete('/:id', deleteEstado);

export default router;
