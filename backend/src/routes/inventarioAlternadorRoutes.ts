import { Router } from 'express';
import {
    getAllInventario,
    getInventarioById,
    createInventario,
    updateInventario,
    deleteInventario
} from '../controllers/inventarioAlternadorController.js';

const router = Router();

// Rutas para Inventario de Alternadores
router.get('/', getAllInventario);
router.get('/:id', getInventarioById);
router.post('/', createInventario);
router.put('/:id', updateInventario);
router.delete('/:id', deleteInventario);

export default router;
