import { Router } from 'express';
import {
    getAllIntentosLogin,
    getIntentosByUsuario,
    getIntentosFallidos,
    getIntentosByIP,
    getIntentoById
} from '../controllers/intentoLoginController.js';

const router = Router();

// Rutas de Intentos de Login (solo lectura - auditoría)
router.get('/', getAllIntentosLogin);
router.get('/fallidos', getIntentosFallidos);
router.get('/usuario/:id_usuario', getIntentosByUsuario);
router.get('/ip/:ip', getIntentosByIP);
router.get('/:id', getIntentoById);

export default router;



















