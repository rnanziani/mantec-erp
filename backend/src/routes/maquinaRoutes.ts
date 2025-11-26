import { Router } from 'express';
import {
    getAllMaquinas,
    getMaquinaById
} from '../controllers/maquinaController.js';

const router = Router();

/**
 * @route   GET /api/maquinas
 * @desc    Obtener todas las máquinas activas
 * @access  Public
 */
router.get('/', getAllMaquinas);

/**
 * @route   GET /api/maquinas/:id
 * @desc    Obtener una máquina por ID
 * @access  Public
 */
router.get('/:id', getMaquinaById);

export default router;
