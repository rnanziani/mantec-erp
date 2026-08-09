import { Router } from 'express';
import {
  createHerramienta,
  deleteHerramienta,
  getAllHerramientas,
  getHerramientaById,
  updateHerramienta,
} from '../controllers/herramientaController.js';

const router = Router();

router.get('/', getAllHerramientas);
router.get('/:id', getHerramientaById);
router.post('/', createHerramienta);
router.put('/:id', updateHerramienta);
router.delete('/:id', deleteHerramienta);

export default router;
