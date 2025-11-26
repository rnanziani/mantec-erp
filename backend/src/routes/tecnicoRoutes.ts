import { Router } from 'express';
import {
    getAllTecnicos,
    getTecnicoById,
    createTecnico,
    updateTecnico,
    deleteTecnico
} from '../controllers/tecnicoController.js';

const router = Router();

/**
 * @route   GET /api/tecnicos
 * @desc    Obtener todos los técnicos
 * @access  Public
 */
router.get('/', getAllTecnicos);

/**
 * @route   GET /api/tecnicos/:id
 * @desc    Obtener un técnico por ID
 * @access  Public
 */
router.get('/:id', getTecnicoById);

/**
 * @route   POST /api/tecnicos
 * @desc    Crear un nuevo técnico
 * @access  Public
 */
router.post('/', createTecnico);

/**
 * @route   PUT /api/tecnicos/:id
 * @desc    Actualizar un técnico
 * @access  Public
 */
router.put('/:id', updateTecnico);

/**
 * @route   DELETE /api/tecnicos/:id
 * @desc    Eliminar un técnico (soft delete)
 * @access  Public
 */
router.delete('/:id', deleteTecnico);

export default router;
