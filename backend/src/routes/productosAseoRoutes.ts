import { Router } from 'express';
import {
  getAllProductos,
  createProducto
} from '../controllers/asignacionProductosAseoController.js';

const router = Router();

/**
 * @route   GET /api/productos-aseo
 * @desc    Obtener todos los productos de aseo
 * @access  Public
 */
router.get('/', getAllProductos);

/**
 * @route   POST /api/productos-aseo
 * @desc    Crear un nuevo producto de aseo
 * @access  Public
 */
router.post('/', createProducto);

export default router;


