import { Router } from 'express';
import {
  getDuracionNeumaticos,
  getDanosNeumaticoConductor,
  getDanosLlantaConductor,
} from '../controllers/reportesNeumaticoController.js';

const router = Router();
router.get('/duracion', getDuracionNeumaticos);
router.get('/danos-neumatico', getDanosNeumaticoConductor);
router.get('/danos-llanta', getDanosLlantaConductor);
export default router;
