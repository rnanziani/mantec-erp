import { Router } from 'express';
import {
  getAllConsumosInsumo,
  getConsumoInsumoById,
  createConsumoInsumo,
  updateConsumoInsumo,
  deleteConsumoInsumo,
  getActaDatos,
  generarActaEntregaPDF
} from '../controllers/consumoInsumoController.js';

const router = Router();

router.get('/', getAllConsumosInsumo);
router.get('/:id/acta-datos', getActaDatos);
router.get('/:id/acta-pdf', generarActaEntregaPDF);
router.get('/:id', getConsumoInsumoById);
router.post('/', createConsumoInsumo);
router.put('/:id', updateConsumoInsumo);
router.delete('/:id', deleteConsumoInsumo);

export default router;
