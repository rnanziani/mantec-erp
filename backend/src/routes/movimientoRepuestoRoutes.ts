import { Router } from 'express';
import {
  createMovimientoRepuesto,
  deleteMovimientoRepuesto,
  getAllMovimientosRepuesto,
  getTiposMovimientoRepuesto,
  getUbicacionesRepuesto,
} from '../controllers/movimientoRepuestoController.js';

const router = Router();
router.get('/ubicaciones', getUbicacionesRepuesto);
router.get('/tipos', getTiposMovimientoRepuesto);
router.get('/', getAllMovimientosRepuesto);
router.post('/', createMovimientoRepuesto);
router.delete('/:id', deleteMovimientoRepuesto);
export default router;
