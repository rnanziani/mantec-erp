import { Router } from 'express';
import {
    getAllTipos,
    getTipoById,
    createTipo,
    updateTipo
} from '../controllers/tipoTransaccionController.js';

const router = Router();

// Rutas de Tipos de Transacción
router.get('/', getAllTipos);
router.get('/:id', getTipoById);
router.post('/', createTipo);
router.put('/:id', updateTipo);

export default router;
