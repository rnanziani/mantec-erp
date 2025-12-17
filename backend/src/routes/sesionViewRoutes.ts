import { Router } from 'express';
import {
    getAllSesiones,
    getSesionesActivas,
    getSesionesExpiradas,
    getSesionesByUsuario,
    getSesionById
} from '../controllers/sesionViewController.js';

const router = Router();

// Rutas de Sesiones (solo lectura - auditoría)
router.get('/', getAllSesiones);
router.get('/activas', getSesionesActivas);
router.get('/expiradas', getSesionesExpiradas);
router.get('/usuario/:id_usuario', getSesionesByUsuario);
router.get('/:id', getSesionById);

export default router;








