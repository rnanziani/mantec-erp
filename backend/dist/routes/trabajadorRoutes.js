import { Router } from 'express';
import { getAllTrabajadores } from '../controllers/trabajadorController.js';
const router = Router();
/**
 * @route   GET /api/trabajadores
 * @desc    Obtener todos los trabajadores activos
 * @access  Public
 */
router.get('/', getAllTrabajadores);
export default router;
