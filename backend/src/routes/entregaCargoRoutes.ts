import { Router } from 'express';
import {
  anularEntregaCargo,
  createDevolucionCargo,
  createEntregaCargo,
  devolverTodoCargo,
  getActaPdfEntregaCargo,
  getAllEntregasCargo,
  getEntregaCargoById,
  getInventarioCargoVigente,
} from '../controllers/entregaCargoController.js';

const router = Router();

router.get('/', getAllEntregasCargo);
router.get('/inventario-vigente', getInventarioCargoVigente);
router.get('/:id/acta-pdf', getActaPdfEntregaCargo);
router.get('/:id', getEntregaCargoById);
router.post('/', createEntregaCargo);
router.post('/devoluciones', createDevolucionCargo);
router.post('/:id/devolver-todo', devolverTodoCargo);
router.post('/:id/anular', anularEntregaCargo);

export default router;
