import { Router } from 'express';
import {
  getAllMarcasNeumatico,
  getMarcaNeumaticoById,
  createMarcaNeumatico,
  updateMarcaNeumatico,
  deleteMarcaNeumatico
} from '../controllers/marcaNeumaticoController.js';

const router = Router();

router.get('/', getAllMarcasNeumatico);
router.get('/:id', getMarcaNeumaticoById);
router.post('/', createMarcaNeumatico);
router.put('/:id', updateMarcaNeumatico);
router.delete('/:id', deleteMarcaNeumatico);

export default router;
