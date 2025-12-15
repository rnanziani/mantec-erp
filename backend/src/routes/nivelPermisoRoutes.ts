import { Router } from 'express';
import {
    getAllNivelPermisos,
    getPermisosByNivel,
    createNivelPermiso,
    deleteNivelPermiso
} from '../controllers/nivelPermisoController.js';

const router = Router();

// Rutas de Relaciones Nivel-Permiso
router.get('/', getAllNivelPermisos);
router.get('/nivel/:id_nivel', getPermisosByNivel);
router.post('/', createNivelPermiso);
router.delete('/:id_nivel/:id_permiso', deleteNivelPermiso);

export default router;


