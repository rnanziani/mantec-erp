import { Router } from 'express';
import {
    getAllUsuarioPermisos,
    getPermisosByUsuario,
    getUsuariosByPermiso,
    createUsuarioPermiso,
    deleteUsuarioPermiso,
    asignarPermisosMasivos,
    removerTodosPermisosUsuario
} from '../controllers/usuarioPermisoController.js';

const router = Router();

// Rutas de Relaciones Usuario-Permiso
router.get('/', getAllUsuarioPermisos);
router.get('/usuario/:id_usuario', getPermisosByUsuario);
router.get('/permiso/:id_permiso', getUsuariosByPermiso);
router.post('/', createUsuarioPermiso);
router.post('/masivo', asignarPermisosMasivos);
router.delete('/:id_usuario/:id_permiso', deleteUsuarioPermiso);
router.delete('/usuario/:id_usuario', removerTodosPermisosUsuario);

export default router;

