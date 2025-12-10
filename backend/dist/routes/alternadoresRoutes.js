import { Router } from 'express';
import { getAllAlternadores, getAlternadorById, createAlternador, updateAlternador, deleteAlternador } from '../controllers/alternadoresController.js';
const router = Router();
/**
 * @route   GET /api/alternadores
 * @desc    Obtener todos los alternadores con información de marca
 * @access  Public
 */
router.get('/', getAllAlternadores);
/**
 * @route   GET /api/alternadores/:id
 * @desc    Obtener un alternador por ID
 * @access  Public
 */
router.get('/:id', getAlternadorById);
/**
 * @route   POST /api/alternadores
 * @desc    Crear un nuevo alternador (código generado automáticamente)
 * @access  Public
 */
router.post('/', createAlternador);
/**
 * @route   PUT /api/alternadores/:id
 * @desc    Actualizar un alternador existente
 * @access  Public
 */
router.put('/:id', updateAlternador);
/**
 * @route   DELETE /api/alternadores/:id
 * @desc    Eliminar un alternador
 * @access  Public
 */
router.delete('/:id', deleteAlternador);
export default router;
