import { Router } from 'express';
import {
  getAllMarcas,
  getMarcaById,
  createMarca,
  updateMarca,
  deleteMarca
} from '../controllers/marcasController.js';

const router = Router();

/**
 * @route   GET /api/marcas
 * @desc    Obtener todas las marcas de alternadores
 * @access  Public
 */
router.get('/', getAllMarcas);

/**
 * @route   GET /api/marcas/:id
 * @desc    Obtener una marca por ID
 * @access  Public
 */
router.get('/:id', getMarcaById);

/**
 * @route   POST /api/marcas
 * @desc    Crear una nueva marca
 * @access  Public
 */
router.post('/', createMarca);

/**
 * @route   PUT /api/marcas/:id
 * @desc    Actualizar una marca existente
 * @access  Public
 */
router.put('/:id', updateMarca);

/**
 * @route   DELETE /api/marcas/:id
 * @desc    Eliminar una marca
 * @access  Public
 */
router.delete('/:id', deleteMarca);

export default router;
