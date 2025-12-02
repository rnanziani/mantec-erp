import { Router } from 'express';
import {
    getAllBodegas,
    getBodegaById,
    createBodega,
    updateBodega,
    toggleBodegaStatus,
    getActiveBodegas
} from '../controllers/bodegaController.js';

const router = Router();

// Rutas de Bodegas
router.get('/', getAllBodegas);
router.get('/activas', getActiveBodegas);
router.get('/:id', getBodegaById);
router.post('/', createBodega);
router.put('/:id', updateBodega);
router.patch('/:id/toggle', toggleBodegaStatus);

export default router;
