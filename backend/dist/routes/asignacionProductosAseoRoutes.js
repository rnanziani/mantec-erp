import { Router } from 'express';
import { getAllAsignaciones, getAsignacionById, createAsignacion, updateAsignacion, deleteAsignacion, getDetallesAsignacion, getReporteDatos, generarReportePDF } from '../controllers/asignacionProductosAseoController.js';
const router = Router();
/**
 * @route   GET /api/asignaciones-productos-aseo/reporte/datos
 * @desc    Obtener datos del reporte de entregas (para vista previa)
 * @access  Public
 * @query   fecha_desde (requerido), fecha_hasta (requerido), patente (opcional), id_trabajador (opcional), id_producto (opcional)
 */
router.get('/reporte/datos', getReporteDatos);
/**
 * @route   GET /api/asignaciones-productos-aseo/reporte/pdf
 * @desc    Generar reporte PDF de entregas de productos de aseo
 * @access  Public
 * @query   fecha_desde (requerido), fecha_hasta (requerido), patente (opcional), id_trabajador (opcional), id_producto (opcional)
 */
router.get('/reporte/pdf', generarReportePDF);
/**
 * @route   GET /api/asignaciones-productos-aseo/:id/detalles
 * @desc    Obtener los detalles de una asignación
 * @access  Public
 */
router.get('/:id/detalles', getDetallesAsignacion);
/**
 * @route   GET /api/asignaciones-productos-aseo
 * @desc    Obtener todas las asignaciones con filtros opcionales
 * @access  Public
 * @query   patente (opcional), nombre (opcional), apellido (opcional)
 */
router.get('/', getAllAsignaciones);
/**
 * @route   GET /api/asignaciones-productos-aseo/:id
 * @desc    Obtener una asignación por ID
 * @access  Public
 */
router.get('/:id', getAsignacionById);
/**
 * @route   POST /api/asignaciones-productos-aseo
 * @desc    Crear una nueva asignación con sus detalles
 * @access  Public
 */
router.post('/', createAsignacion);
/**
 * @route   PUT /api/asignaciones-productos-aseo/:id
 * @desc    Actualizar una asignación existente
 * @access  Public
 */
router.put('/:id', updateAsignacion);
/**
 * @route   DELETE /api/asignaciones-productos-aseo/:id
 * @desc    Eliminar una asignación
 * @access  Public
 */
router.delete('/:id', deleteAsignacion);
export default router;
