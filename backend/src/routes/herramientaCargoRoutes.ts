import { Router } from 'express';
import {
  createHerramientaCargo,
  deleteHerramientaCargo,
  getAllHerramientasCargo,
  getHerramientaCargoById,
  updateHerramientaCargo,
} from '../controllers/herramientaCargoController.js';

const router = Router();

router.get('/', getAllHerramientasCargo);
router.get('/:id', getHerramientaCargoById);
router.post('/', createHerramientaCargo);
router.put('/:id', updateHerramientaCargo);
router.delete('/:id', deleteHerramientaCargo);

export default router;
