import { Router } from 'express';
import {
  createVehiculo,
  deleteVehiculo,
  getAllVehiculos,
  getVehiculoById,
  updateVehiculo,
} from '../controllers/vehiculoController.js';

const router = Router();

router.get('/', getAllVehiculos);
router.get('/:id', getVehiculoById);
router.post('/', createVehiculo);
router.put('/:id', updateVehiculo);
router.delete('/:id', deleteVehiculo);

export default router;
