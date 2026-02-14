import { Router } from 'express';
import { getAllProductos, getProductoById, createProducto, updateProducto, deleteProducto } from '../controllers/asignacionProductosAseoController.js';
const router = Router();
/**
 * @route   GET /api/productos-aseo
 * @desc    Obtener todos los productos de aseo
 * @access  Public
 */
router.get('/', getAllProductos);
/**
 * @route   GET /api/productos-aseo/:id
 * @desc    Obtener un producto de aseo por ID
 * @access  Public
 */
router.get('/:id', getProductoById);
/**
 * @route   POST /api/productos-aseo
 * @desc    Crear un nuevo producto de aseo
 * @access  Public
 */
router.post('/', createProducto);
/**
 * @route   PUT /api/productos-aseo/:id
 * @desc    Actualizar un producto de aseo
 * @access  Public
 */
router.put('/:id', updateProducto);
/**
 * @route   DELETE /api/productos-aseo/:id
 * @desc    Eliminar un producto de aseo
 * @access  Public
 */
router.delete('/:id', deleteProducto);
export default router;
