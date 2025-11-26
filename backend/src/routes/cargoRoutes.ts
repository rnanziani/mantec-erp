import { Router } from 'express';
import { getAllCargos } from '../controllers/cargoController.js';

const router = Router();

/**
 * @route   GET /api/cargos
 * @desc    Obtener todos los cargos
 * @access  Public
 */
router.get('/', getAllCargos);

export default router;
