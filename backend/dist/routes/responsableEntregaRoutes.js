import { Router } from 'express';
import { getAllResponsables } from '../controllers/responsableEntregaController.js';
const router = Router();
/**
 * @route   GET /api/responsables-entrega
 * @desc    Obtener todos los responsables de entrega
 * @access  Public
 */
router.get('/', getAllResponsables);
export default router;
