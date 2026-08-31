import { Router } from 'express';
import {
  createProveedor,
  deleteProveedor,
  getAllProveedores,
  getProveedorById,
  updateProveedor,
} from '../controllers/proveedorController.js';

const router = Router();

router.get('/', getAllProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);

export default router;
