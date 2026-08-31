import { Router } from 'express';
import {
  createEntrega,
  deleteEntrega,
  getAllEntregas,
  getAllLineasEntrega,
  getEntregaById,
  getLineasPendientesRecepcion,
  updateEntrega,
} from '../controllers/entregaRepuestoController.js';

const router = Router();

router.get('/', getAllEntregas);
router.get('/lineas', getAllLineasEntrega);
router.get('/pendientes-recepcion', getLineasPendientesRecepcion);
router.get('/:id', getEntregaById);
router.post('/', createEntrega);
router.put('/:id', updateEntrega);
router.delete('/:id', deleteEntrega);

export default router;
