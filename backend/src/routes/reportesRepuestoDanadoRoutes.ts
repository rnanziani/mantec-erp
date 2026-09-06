import { Router } from 'express';
import {
  getRecepcionesTaller,
  getEstadoProveedor,
  getInstalados,
} from '../controllers/reportesRepuestoDanadoController.js';

const router = Router();
router.get('/recepciones', getRecepcionesTaller);
router.get('/estado-proveedor', getEstadoProveedor);
router.get('/instalados', getInstalados);
export default router;
