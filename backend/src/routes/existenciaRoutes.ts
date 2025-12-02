import { Router } from 'express';
import {
    getAllExistencias,
    getExistenciasByAlternador,
    getExistenciasByBodega,
    getStockBajo,
    getStockTotalPorAlternador
} from '../controllers/existenciaController.js';

const router = Router();

// Rutas de Existencias (Stock)
router.get('/', getAllExistencias);
router.get('/bajo-stock', getStockBajo);
router.get('/total-por-alternador', getStockTotalPorAlternador);
router.get('/alternador/:id', getExistenciasByAlternador);
router.get('/bodega/:id', getExistenciasByBodega);

export default router;
