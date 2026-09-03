import { Router } from 'express';
import {
  createConsumoLubricante,
  deleteConsumoLubricante,
  getAllConsumosLubricante,
  getConsumoLubricanteById,
  updateConsumoLubricante,
} from '../controllers/consumoLubricanteController.js';

const router = Router();

router.get('/', getAllConsumosLubricante);
router.get('/:id', getConsumoLubricanteById);
router.post('/', createConsumoLubricante);
router.put('/:id', updateConsumoLubricante);
router.delete('/:id', deleteConsumoLubricante);

export default router;
