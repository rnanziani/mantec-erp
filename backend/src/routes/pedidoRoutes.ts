import { Router } from 'express';
import {
  anularPedido,
  createPedido,
  deletePedido,
  getAllPedidos,
  getHistorialPedido,
  getPedidoById,
  getVerificadorPedidos,
  marcarNoRetirado,
  registrarPago,
  registrarRecepcion,
  updatePedido,
} from '../controllers/pedidoController.js';

const router = Router();

router.get('/', getAllPedidos);
router.get('/verificador', getVerificadorPedidos);
router.get('/:id/historial', getHistorialPedido);
router.get('/:id', getPedidoById);
router.post('/', createPedido);
router.put('/:id', updatePedido);
router.delete('/:id', deletePedido);
router.post('/:id/recepciones', registrarRecepcion);
router.post('/:id/pago', registrarPago);
router.post('/:id/anular', anularPedido);
router.post('/:id/no-retirado', marcarNoRetirado);

export default router;
