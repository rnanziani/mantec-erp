import { Router } from 'express';
import {
  getAllInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  deleteInsumo
} from '../controllers/insumoController.js';

const router = Router();

router.get('/', getAllInsumos);
router.get('/:id', getInsumoById);
router.post('/', createInsumo);
router.put('/:id', updateInsumo);
router.delete('/:id', deleteInsumo);

export default router;

