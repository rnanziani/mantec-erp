import { Router } from 'express';
import {
  createEstadoReparacion,
  deleteEstadoReparacion,
  getAllEstadosReparacion,
  getEstadoReparacionById,
  updateEstadoReparacion,
} from '../controllers/estadoReparacionController.js';

const router = Router();

router.get('/', getAllEstadosReparacion);
router.get('/:id', getEstadoReparacionById);
router.post('/', createEstadoReparacion);
router.put('/:id', updateEstadoReparacion);
router.delete('/:id', deleteEstadoReparacion);

export default router;
