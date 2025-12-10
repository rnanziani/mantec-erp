import { Router } from 'express';
import { getAllExistencias, getExistenciaById, upsertExistencia, deleteExistencia } from '../controllers/existenciaController.js';
const router = Router();
/**
 * @route   GET /api/existencias
 * @desc    Obtener todas las existencias con información de alternador, marca y ubicación
 * @access  Public
 */
router.get('/', getAllExistencias);
/**
 * @route   GET /api/existencias/:id
 * @desc    Obtener una existencia por ID
 * @access  Public
 */
router.get('/:id', getExistenciaById);
/**
 * @route   POST /api/existencias
 * @desc    Crear o actualizar una existencia (UPSERT)
 * @access  Public
 */
router.post('/', upsertExistencia);
/**
 * @route   DELETE /api/existencias/:id
 * @desc    Eliminar una existencia
 * @access  Public
 */
router.delete('/:id', deleteExistencia);
export default router;
