import { Router } from 'express';
import {
  getAllMarcasInsumo,
  getMarcaInsumoById,
  createMarcaInsumo,
  updateMarcaInsumo,
  deleteMarcaInsumo
} from '../controllers/marcaInsumoController.js';

const router = Router();

router.get('/', getAllMarcasInsumo);
router.get('/:id', getMarcaInsumoById);
router.post('/', createMarcaInsumo);
router.put('/:id', updateMarcaInsumo);
router.delete('/:id', deleteMarcaInsumo);

export default router;
