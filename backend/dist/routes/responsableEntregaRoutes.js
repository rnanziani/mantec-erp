import { Router } from 'express';
import { getAllResponsables, getResponsableById, createResponsable, updateResponsable, deleteResponsable } from '../controllers/responsableEntregaController.js';
const router = Router();
/**
 * @route   GET /api/responsables-entrega
 * @desc    Obtener todos los responsables de entrega
 */
router.get('/', getAllResponsables);
/**
 * @route   GET /api/responsables-entrega/:id
 * @desc    Obtener un responsable por ID
 */
router.get('/:id', getResponsableById);
/**
 * @route   POST /api/responsables-entrega
 * @desc    Crear un responsable de entrega
 */
router.post('/', createResponsable);
/**
 * @route   PUT /api/responsables-entrega/:id
 * @desc    Actualizar un responsable de entrega
 */
router.put('/:id', updateResponsable);
/**
 * @route   DELETE /api/responsables-entrega/:id
 * @desc    Eliminar un responsable de entrega
 */
router.delete('/:id', deleteResponsable);
export default router;
