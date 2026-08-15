import { Router } from 'express';
import {
  createElementoEpp,
  deleteElementoEpp,
  getAllElementosEpp,
  getElementoEppById,
  updateElementoEpp,
} from '../controllers/eppElementoController.js';

const router = Router();

router.get('/', getAllElementosEpp);
router.get('/:id', getElementoEppById);
router.post('/', createElementoEpp);
router.put('/:id', updateElementoEpp);
router.delete('/:id', deleteElementoEpp);

export default router;
