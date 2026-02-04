import { Router } from 'express';
import {
    getAllPermisos,
    getPermisoById,
    createPermiso,
    updatePermiso,
    deletePermiso
} from '../controllers/permisoController.js';

const router = Router();

// Rutas de Permisos
router.get('/', getAllPermisos);
router.get('/:id', getPermisoById);
router.post('/', createPermiso);
router.put('/:id', updatePermiso);
router.delete('/:id', deletePermiso);

export default router;













































