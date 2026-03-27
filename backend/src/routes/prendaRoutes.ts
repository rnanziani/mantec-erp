import { Router } from 'express';
import {
  getAllPrendas,
  getPrendaById,
  createPrenda,
  updatePrenda,
  deletePrenda
} from '../controllers/prendaController.js';

const router = Router();

router.get('/', getAllPrendas);
router.get('/:id', getPrendaById);
router.post('/', createPrenda);
router.put('/:id', updatePrenda);
router.delete('/:id', deletePrenda);

export default router;

