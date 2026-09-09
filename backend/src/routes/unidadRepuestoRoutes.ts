import { Router } from 'express';
import {
  createUnidadRepuesto,
  deleteUnidadRepuesto,
  getAllUnidadesRepuesto,
  getUnidadRepuestoById,
  updateUnidadRepuesto,
} from '../controllers/unidadRepuestoController.js';

const router = Router();
router.get('/', getAllUnidadesRepuesto);
router.get('/:id', getUnidadRepuestoById);
router.post('/', createUnidadRepuesto);
router.put('/:id', updateUnidadRepuesto);
router.delete('/:id', deleteUnidadRepuesto);
export default router;
