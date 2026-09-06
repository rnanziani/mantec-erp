import { Router } from 'express';
import {
  getAllTiposDanoLlanta,
  getTipoDanoLlantaById,
  createTipoDanoLlanta,
  updateTipoDanoLlanta,
  deleteTipoDanoLlanta,
} from '../controllers/tipoDanoLlantaController.js';

const router = Router();
router.get('/', getAllTiposDanoLlanta);
router.get('/:id', getTipoDanoLlantaById);
router.post('/', createTipoDanoLlanta);
router.put('/:id', updateTipoDanoLlanta);
router.delete('/:id', deleteTipoDanoLlanta);
export default router;
