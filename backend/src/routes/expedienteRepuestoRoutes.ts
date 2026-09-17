import { Router } from 'express';
import {
  createExpediente,
  deleteExpediente,
  getAllExpedientes,
  getExpedienteById,
  getGarantiasExpediente,
  getResumenExpedientes,
  updateExpediente,
} from '../controllers/expedienteRepuestoController.js';

const router = Router();

router.get('/', getAllExpedientes);
router.get('/resumen', getResumenExpedientes);
router.get('/garantias', getGarantiasExpediente);
router.get('/:id', getExpedienteById);
router.post('/', createExpediente);
router.put('/:id', updateExpediente);
router.delete('/:id', deleteExpediente);

export default router;
