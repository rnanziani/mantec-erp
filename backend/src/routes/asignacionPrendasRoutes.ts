import { Router } from 'express';
import {
  getAllAsignaciones,
  getAsignacionById,
  getDetallesAsignacion,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion,
  getAllPrendas,
  getAllTallas,
  getActaDatos,
  generarActaEntregaPDF,
  getReporteDatos,
  generarReportePDF
} from '../controllers/asignacionPrendasController.js';

const router = Router();

/**
 * @route   GET /api/asignaciones-prendas/prendas
 * @desc    Obtener todas las prendas
 * @access  Public
 */
router.get('/prendas', getAllPrendas);

/**
 * @route   GET /api/asignaciones-prendas/tallas
 * @desc    Obtener todas las tallas
 * @access  Public
 */
router.get('/tallas', getAllTallas);

/**
 * @route   GET /api/asignaciones-prendas/reporte/datos
 * @desc    Obtener datos del reporte (filtros: fechaDesde, fechaHasta, idTrabajador, idPrenda)
 * @access  Public
 */
router.get('/reporte/datos', getReporteDatos);

/**
 * @route   GET /api/asignaciones-prendas/reporte/pdf
 * @desc    Generar PDF del reporte (formato carta, horizontal)
 * @access  Public
 */
router.get('/reporte/pdf', generarReportePDF);

/**
 * @route   GET /api/asignaciones-prendas/:id/detalles
 * @desc    Obtener detalles de una asignación
 * @access  Public
 */
router.get('/:id/detalles', getDetallesAsignacion);

/**
 * @route   GET /api/asignaciones-prendas/:id/acta-datos
 * @desc    Obtener datos del acta para vista previa (JSON)
 * @access  Public
 */
router.get('/:id/acta-datos', getActaDatos);

/**
 * @route   GET /api/asignaciones-prendas/:id/acta-pdf
 * @desc    Generar PDF del Acta de Entrega de Uniforme (SIG F-622-005)
 * @access  Public
 */
router.get('/:id/acta-pdf', generarActaEntregaPDF);

/**
 * @route   GET /api/asignaciones-prendas/:id
 * @desc    Obtener una asignación por ID
 * @access  Public
 */
router.get('/:id', getAsignacionById);

/**
 * @route   GET /api/asignaciones-prendas
 * @desc    Obtener todas las asignaciones de prendas
 * @access  Public
 */
router.get('/', getAllAsignaciones);

/**
 * @route   POST /api/asignaciones-prendas
 * @desc    Crear una nueva asignación de prendas
 * @access  Public
 */
router.post('/', createAsignacion);

/**
 * @route   PUT /api/asignaciones-prendas/:id
 * @desc    Actualizar una asignación de prendas
 * @access  Public
 */
router.put('/:id', updateAsignacion);

/**
 * @route   DELETE /api/asignaciones-prendas/:id
 * @desc    Eliminar una asignación de prendas
 * @access  Public
 */
router.delete('/:id', deleteAsignacion);

export default router;


