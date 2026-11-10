import { Router } from 'express';
import {
  anularPedido,
  cerrarLineaPedido,
  createPedido,
  deletePedido,
  deshacerEnvioWhatsApp,
  generarPdfConsultaProveedor,
  generarPdfDetalle,
  generarPdfPagos,
  generarPdfPedido,
  getAllPedidos,
  getConsultaProveedor,
  getHistorialPedido,
  getPedidoById,
  getResumenPago,
  getVerificadorPedidos,
  marcarNoRetirado,
  trasladarPedido,
  registrarEnvioWhatsApp,
  registrarPago,
  registrarRecepcion,
  updatePedido,
} from '../controllers/pedidoController.js';

const router = Router();

router.get('/', getAllPedidos);
router.get('/verificador', getVerificadorPedidos);
router.get('/consulta-proveedor', getConsultaProveedor);
router.get('/consulta-proveedor/pdf', generarPdfConsultaProveedor);
router.get('/resumen-pago', getResumenPago);
router.get('/pdf-pagos', generarPdfPagos);
router.get('/:id/historial', getHistorialPedido);
router.get('/:id/pdf', generarPdfPedido);
router.get('/:id/pdf-detalle', generarPdfDetalle);
router.get('/:id', getPedidoById);
router.post('/', createPedido);
router.put('/:id', updatePedido);
router.delete('/:id', deletePedido);
router.post('/:id/recepciones', registrarRecepcion);
router.post('/:id/pago', registrarPago);
router.post('/:id/anular', anularPedido);
router.post('/:id/no-retirado', marcarNoRetirado);
router.post('/:id/cerrar-linea', cerrarLineaPedido);
router.post('/:id/trasladar', trasladarPedido);
router.post('/:id/envios-whatsapp', registrarEnvioWhatsApp);
router.delete('/:id/envios-whatsapp/:idEnvio', deshacerEnvioWhatsApp);

export default router;
