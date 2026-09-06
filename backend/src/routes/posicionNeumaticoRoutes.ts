import { Router } from 'express';
import {
  getAllPosicionesNeumatico,
  getPosicionNeumaticoById,
  createPosicionNeumatico,
  updatePosicionNeumatico,
  deletePosicionNeumatico,
} from '../controllers/posicionNeumaticoController.js';

const router = Router();
router.get('/', getAllPosicionesNeumatico);
router.get('/:id', getPosicionNeumaticoById);
router.post('/', createPosicionNeumatico);
router.put('/:id', updatePosicionNeumatico);
router.delete('/:id', deletePosicionNeumatico);
export default router;
