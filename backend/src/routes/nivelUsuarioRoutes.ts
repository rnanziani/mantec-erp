import { Router } from 'express';
import {
    getAllNivelesUsuario,
    getNivelUsuarioById,
    createNivelUsuario,
    updateNivelUsuario,
    deleteNivelUsuario
} from '../controllers/nivelUsuarioController.js';

const router = Router();

// Rutas de Niveles de Usuario
router.get('/', getAllNivelesUsuario);
router.get('/:id', getNivelUsuarioById);
router.post('/', createNivelUsuario);
router.put('/:id', updateNivelUsuario);
router.delete('/:id', deleteNivelUsuario);

export default router;




































