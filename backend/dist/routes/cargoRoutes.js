import { Router } from 'express';
import { getAllCargos, getCargoById, createCargo, updateCargo, deleteCargo } from '../controllers/cargoController.js';
const router = Router();
console.log('✅ Rutas de Cargos cargadas');
/**
 * @route   GET /api/cargos
 * @desc    Obtener todos los cargos
 * @access  Public
 */
router.get('/', getAllCargos);
console.log('✅ GET / registrado');
/**
 * @route   GET /api/cargos/:id
 * @desc    Obtener un cargo por ID
 * @access  Public
 */
router.get('/:id', getCargoById);
/**
 * @route   POST /api/cargos
 * @desc    Crear un nuevo cargo
 * @access  Public
 */
router.post('/', createCargo);
console.log('✅ POST / registrado');
console.log('🔍 Tipo de createCargo:', typeof createCargo);
console.log('🔍 createCargo es función?', typeof createCargo === 'function');
/**
 * @route   PUT /api/cargos/:id
 * @desc    Actualizar un cargo existente
 * @access  Public
 */
router.put('/:id', updateCargo);
/**
 * @route   DELETE /api/cargos/:id
 * @desc    Eliminar un cargo
 * @access  Public
 */
router.delete('/:id', deleteCargo);
export default router;
