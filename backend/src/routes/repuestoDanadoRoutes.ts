import { Router } from 'express';
import {
  createRepuestoDanado,
  deleteRepuestoDanado,
  getAllRepuestosDanados,
  getRepuestoDanadoById,
  updateRepuestoDanado,
} from '../controllers/repuestoDanadoController.js';

const router = Router();

router.get('/', getAllRepuestosDanados);
router.get('/:id', getRepuestoDanadoById);
router.post('/', createRepuestoDanado);
router.put('/:id', updateRepuestoDanado);
router.delete('/:id', deleteRepuestoDanado);

export default router;
