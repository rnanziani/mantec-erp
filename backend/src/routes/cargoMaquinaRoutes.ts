import { Router } from 'express';
import {
  getAllCargoMaquina,
  getCargoMaquinaById,
  getDetallesCargoMaquina,
  createCargoMaquina,
  updateCargoMaquina,
  deleteCargoMaquina,
} from '../controllers/cargoMaquinaController.js';

const router = Router();

router.get('/', getAllCargoMaquina);
router.get('/:id/detalles', getDetallesCargoMaquina);
router.get('/:id', getCargoMaquinaById);
router.post('/', createCargoMaquina);
router.put('/:id', updateCargoMaquina);
router.delete('/:id', deleteCargoMaquina);

export default router;
