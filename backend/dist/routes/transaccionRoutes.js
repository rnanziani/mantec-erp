import { Router } from 'express';
import { getAllTransacciones, getTransaccionById, createTransaccion, updateTransaccion, deleteTransaccion, getTransaccionesFiltradas, generarReportePDF } from '../controllers/transaccionController.js';
const router = Router();
/**
 * @route   GET /api/transacciones/reporte/pdf
 * @desc    Generar reporte PDF de transacciones con filtros
 * @access  Public
 * @query   fecha_desde (requerido), fecha_hasta (requerido), id_tipo_transaccion (opcional), id_marca (opcional), id_destino (opcional), id_maquina (opcional)
 */
router.get('/reporte/pdf', generarReportePDF);
/**
 * @route   GET /api/transacciones/filtradas
 * @desc    Obtener transacciones filtradas (para uso en frontend)
 * @access  Public
 * @query   fecha_desde (requerido), fecha_hasta (requerido), id_tipo_transaccion (opcional), id_marca (opcional), id_destino (opcional), id_maquina (opcional)
 */
router.get('/filtradas', getTransaccionesFiltradas);
/**
 * @route   GET /api/transacciones
 * @desc    Obtener todas las transacciones con información completa
 * @access  Public
 */
router.get('/', getAllTransacciones);
/**
 * @route   GET /api/transacciones/:id
 * @desc    Obtener una transacción por ID
 * @access  Public
 */
router.get('/:id', getTransaccionById);
/**
 * @route   POST /api/transacciones
 * @desc    Crear una nueva transacción
 * @access  Public
 */
router.post('/', createTransaccion);
/**
 * @route   PUT /api/transacciones/:id
 * @desc    Actualizar una transacción existente
 * @access  Public
 */
router.put('/:id', updateTransaccion);
/**
 * @route   DELETE /api/transacciones/:id
 * @desc    Eliminar una transacción
 * @access  Public
 */
router.delete('/:id', deleteTransaccion);
export default router;
