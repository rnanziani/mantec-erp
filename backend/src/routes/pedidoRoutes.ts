import { Router } from 'express';
import {
  anularPedido,
  cerrarLineaPedido,
  createPedido,
  deletePedido,
  deshacerEnvioWhatsApp,
  generarPdfPedido,
  getAllPedidos,
  getHistorialPedido,
  getPedidoById,
  getResumenPago,
  getVerificadorPedidos,
  marcarNoRetirado,
  registrarEnvioWhatsApp,
  registrarPago,
  registrarRecepcion,
  updatePedido,
} from '../controllers/pedidoController.js';

const router = Router();

router.get('/', getAllPedidos);
router.get('/verificador', getVerificadorPedidos);
router.get('/resumen-pago', getResumenPago);
router.get('/:id/historial', getHistorialPedido);
router.get('/:id/pdf', generarPdfPedido);
router.get('/:id', getPedidoById);
router.post('/', createPedido);
router.put('/:id', updatePedido);
router.delete('/:id', deletePedido);
router.post('/:id/recepciones', registrarRecepcion);
router.post('/:id/pago', registrarPago);
router.post('/:id/anular', anularPedido);
router.post('/:id/no-retirado', marcarNoRetirado);
router.post('/:id/cerrar-linea', cerrarLineaPedido);
router.post('/:id/envios-whatsapp', registrarEnvioWhatsApp);
router.delete('/:id/envios-whatsapp/:idEnvio', deshacerEnvioWhatsApp);

export default router;
