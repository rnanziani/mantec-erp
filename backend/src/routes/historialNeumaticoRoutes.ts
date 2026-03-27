import { Router } from 'express';
import {
  getAllHistorial,
  getHistorialById,
  createHistorial,
  updateHistorial,
  deleteHistorial
} from '../controllers/historialNeumaticoController.js';

const router = Router();

router.get('/', getAllHistorial);
router.get('/:id', getHistorialById);
router.post('/', createHistorial);
router.put('/:id', updateHistorial);
router.delete('/:id', deleteHistorial);

export default router;
