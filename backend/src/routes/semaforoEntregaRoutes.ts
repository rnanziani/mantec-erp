import { Router } from 'express';
import {
  createSemaforo,
  deleteSemaforo,
  getAllSemaforos,
  getSemaforoById,
  updateSemaforo,
} from '../controllers/semaforoEntregaController.js';

const router = Router();

router.get('/', getAllSemaforos);
router.get('/:id', getSemaforoById);
router.post('/', createSemaforo);
router.put('/:id', updateSemaforo);
router.delete('/:id', deleteSemaforo);

export default router;
