import { Router } from 'express';
import { getAllEmpresas } from '../controllers/empresaController.js';

const router = Router();

/**
 * @route   GET /api/empresas
 * @desc    Obtener todas las empresas
 * @access  Public
 */
router.get('/', getAllEmpresas);

export default router;


































