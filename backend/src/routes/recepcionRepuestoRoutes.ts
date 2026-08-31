import { Router } from 'express';
import {
  createRecepcion,
  deleteRecepcion,
  getAllRecepciones,
  getDetallesRecepcion,
  getRecepcionById,
  updateRecepcion,
} from '../controllers/recepcionRepuestoController.js';

const router = Router();

router.get('/', getAllRecepciones);
router.get('/:id/detalles', getDetallesRecepcion);
router.get('/:id', getRecepcionById);
router.post('/', createRecepcion);
router.put('/:id', updateRecepcion);
router.delete('/:id', deleteRecepcion);

export default router;
