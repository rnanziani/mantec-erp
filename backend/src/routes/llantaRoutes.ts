import { Router } from 'express';
import {
  getAllLlantas,
  getLlantaById,
  createLlanta,
  updateLlanta,
  deleteLlanta
} from '../controllers/llantaController.js';

const router = Router();

router.get('/', getAllLlantas);
router.get('/:id', getLlantaById);
router.post('/', createLlanta);
router.put('/:id', updateLlanta);
router.delete('/:id', deleteLlanta);

export default router;
