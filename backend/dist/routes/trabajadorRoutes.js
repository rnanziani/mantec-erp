import { Router } from 'express';
import { getAllTrabajadores, getTrabajadorById, createTrabajador, updateTrabajador, deleteTrabajador } from '../controllers/trabajadorController.js';
const router = Router();
/**
 * @route   GET /api/trabajadores
 * @desc    Obtener todos los trabajadores
 * @access  Public
 */
router.get('/', getAllTrabajadores);
/**
 * @route   GET /api/trabajadores/:id
 * @desc    Obtener un trabajador por ID
 * @access  Public
 */
router.get('/:id', getTrabajadorById);
/**
 * @route   POST /api/trabajadores
 * @desc    Crear un nuevo trabajador
 * @access  Public
 */
router.post('/', createTrabajador);
/**
 * @route   PUT /api/trabajadores/:id
 * @desc    Actualizar un trabajador
 * @access  Public
 */
router.put('/:id', updateTrabajador);
/**
 * @route   DELETE /api/trabajadores/:id
 * @desc    Eliminar un trabajador (soft delete)
 * @access  Public
 */
router.delete('/:id', deleteTrabajador);
export default router;
