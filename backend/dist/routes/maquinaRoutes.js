import { Router } from 'express';
import { getAllMaquinas, getMaquinaById, createMaquina, updateMaquina, deleteMaquina } from '../controllers/maquinaController.js';
const router = Router();
/**
 * @route   GET /api/maquinas
 * @desc    Obtener todas las máquinas
 * @access  Public
 */
router.get('/', getAllMaquinas);
/**
 * @route   GET /api/maquinas/:id
 * @desc    Obtener una máquina por ID
 * @access  Public
 */
router.get('/:id', getMaquinaById);
/**
 * @route   POST /api/maquinas
 * @desc    Crear una nueva máquina
 * @access  Public
 */
router.post('/', createMaquina);
/**
 * @route   PUT /api/maquinas/:id
 * @desc    Actualizar una máquina
 * @access  Public
 */
router.put('/:id', updateMaquina);
/**
 * @route   DELETE /api/maquinas/:id
 * @desc    Eliminar una máquina (soft delete)
 * @access  Public
 */
router.delete('/:id', deleteMaquina);
export default router;
