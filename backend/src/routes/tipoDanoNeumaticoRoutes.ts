import { Router } from 'express';
import {
  getAllTiposDanoNeumatico,
  getTipoDanoNeumaticoById,
  createTipoDanoNeumatico,
  updateTipoDanoNeumatico,
  deleteTipoDanoNeumatico,
} from '../controllers/tipoDanoNeumaticoController.js';

const router = Router();
router.get('/', getAllTiposDanoNeumatico);
router.get('/:id', getTipoDanoNeumaticoById);
router.post('/', createTipoDanoNeumatico);
router.put('/:id', updateTipoDanoNeumatico);
router.delete('/:id', deleteTipoDanoNeumatico);
export default router;
