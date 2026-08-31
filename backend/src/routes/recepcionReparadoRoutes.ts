import { Router } from 'express';
import {
  createRecepcionReparado,
  deleteRecepcionReparado,
  getAllRecepcionesReparado,
  getLineasEntregaDisponibles,
  getRecepcionReparadoById,
  updateRecepcionReparado,
} from '../controllers/recepcionReparadoController.js';

const router = Router();

router.get('/', getAllRecepcionesReparado);
router.get('/lineas-entrega-disponibles', getLineasEntregaDisponibles);
router.get('/:id', getRecepcionReparadoById);
router.post('/', createRecepcionReparado);
router.put('/:id', updateRecepcionReparado);
router.delete('/:id', deleteRecepcionReparado);

export default router;
