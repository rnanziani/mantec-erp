import { Router } from 'express';
import { getAllExistenciasRepuesto } from '../controllers/existenciaRepuestoController.js';

const router = Router();
router.get('/', getAllExistenciasRepuesto);
export default router;
