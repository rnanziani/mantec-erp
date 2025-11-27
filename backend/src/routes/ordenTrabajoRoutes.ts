import { Router } from 'express';
import {
    getAllOrdenes,
    getOrdenById,
    createOrden,
    updateOrden,
    deleteOrden
} from '../controllers/ordenTrabajoController.js';

const router = Router();

// Rutas para órdenes de trabajo
router.get('/', getAllOrdenes);
router.get('/:id', getOrdenById);
router.post('/', createOrden);
router.put('/:id', updateOrden);
router.delete('/:id', deleteOrden);

export default router;
