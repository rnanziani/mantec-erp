import { Router } from 'express';
import {
  createProveedorPedido,
  deleteProveedorPedido,
  getAllProveedoresPedido,
  getProveedorPedidoById,
  updateProveedorPedido,
} from '../controllers/proveedorPedidoController.js';

const router = Router();

router.get('/', getAllProveedoresPedido);
router.get('/:id', getProveedorPedidoById);
router.post('/', createProveedorPedido);
router.put('/:id', updateProveedorPedido);
router.delete('/:id', deleteProveedorPedido);

export default router;
