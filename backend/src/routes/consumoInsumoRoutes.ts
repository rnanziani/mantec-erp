import { Router } from 'express';
import {
  getAllConsumosInsumo,
  getConsumoInsumoById,
  createConsumoInsumo,
  updateConsumoInsumo,
  deleteConsumoInsumo
} from '../controllers/consumoInsumoController.js';

const router = Router();

router.get('/', getAllConsumosInsumo);
router.get('/:id', getConsumoInsumoById);
router.post('/', createConsumoInsumo);
router.put('/:id', updateConsumoInsumo);
router.delete('/:id', deleteConsumoInsumo);

export default router;
