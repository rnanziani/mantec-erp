import { Router } from 'express';
import {
    getAllTransacciones,
    getTransaccionById,
    createTransaccion,
    getTransaccionesByAlternador,
    getTransaccionesByBodega
} from '../controllers/transaccionController.js';

const router = Router();

// Rutas de Transacciones
router.get('/', getAllTransacciones);
router.get('/:id', getTransaccionById);
router.post('/', createTransaccion);
router.get('/alternador/:id', getTransaccionesByAlternador);
router.get('/bodega/:id', getTransaccionesByBodega);

export default router;
