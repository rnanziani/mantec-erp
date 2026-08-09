import { Router } from 'express';
import {
  createPanol,
  deletePanol,
  getAllPanol,
  getDetallesPanol,
  getPanolById,
  updatePanol,
} from '../controllers/panolController.js';

const router = Router();

router.get('/', getAllPanol);
router.get('/:id/detalles', getDetallesPanol);
router.get('/:id', getPanolById);
router.post('/', createPanol);
router.put('/:id', updatePanol);
router.delete('/:id', deletePanol);

export default router;
