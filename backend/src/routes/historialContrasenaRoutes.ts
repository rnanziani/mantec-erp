import { Router } from 'express';
import {
    getAllHistorialContrasenas,
    getHistorialByUsuario,
    getHistorialById
} from '../controllers/historialContrasenaController.js';

const router = Router();

// Rutas de Historial de Contraseñas (solo lectura)
router.get('/', getAllHistorialContrasenas);
router.get('/usuario/:id_usuario', getHistorialByUsuario);
router.get('/:id', getHistorialById);

export default router;


