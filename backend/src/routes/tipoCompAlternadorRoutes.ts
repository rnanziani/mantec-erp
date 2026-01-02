import { Router } from 'express';
import {
  getAllTipoCompAlternador,
  getTipoCompAlternadorById,
  createTipoCompAlternador,
  updateTipoCompAlternador,
  deleteTipoCompAlternador
} from '../controllers/tipoCompAlternadorController.js';

const router = Router();

/**
 * @route   GET /api/tipos-comp-alternador
 * @desc    Obtener todos los tipos de componente alternador
 * @access  Public
 */
router.get('/', getAllTipoCompAlternador);

/**
 * @route   GET /api/tipos-comp-alternador/:id
 * @desc    Obtener un tipo de componente alternador por ID
 * @access  Public
 */
router.get('/:id', getTipoCompAlternadorById);

/**
 * @route   POST /api/tipos-comp-alternador
 * @desc    Crear un nuevo tipo de componente alternador
 * @access  Public
 */
router.post('/', createTipoCompAlternador);

/**
 * @route   PUT /api/tipos-comp-alternador/:id
 * @desc    Actualizar un tipo de componente alternador existente
 * @access  Public
 */
router.put('/:id', updateTipoCompAlternador);

/**
 * @route   DELETE /api/tipos-comp-alternador/:id
 * @desc    Eliminar un tipo de componente alternador
 * @access  Public
 */
router.delete('/:id', deleteTipoCompAlternador);

export default router;

