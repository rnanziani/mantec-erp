import { Router } from 'express';
import {
  getAllNeumaticos,
  getNeumaticoById,
  createNeumatico,
  updateNeumatico,
  deleteNeumatico
} from '../controllers/neumaticoController.js';

const router = Router();

router.get('/', getAllNeumaticos);
router.get('/:id', getNeumaticoById);
router.post('/', createNeumatico);
router.put('/:id', updateNeumatico);
router.delete('/:id', deleteNeumatico);

export default router;
