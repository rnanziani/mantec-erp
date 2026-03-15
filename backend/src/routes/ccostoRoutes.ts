import { Router } from 'express';
import {
  getAllCcostos,
  getCcostoById,
  createCcosto,
  updateCcosto,
  deleteCcosto
} from '../controllers/ccostoController.js';

const router = Router();

router.get('/', getAllCcostos);
router.get('/:id', getCcostoById);
router.post('/', createCcosto);
router.put('/:id', updateCcosto);
router.delete('/:id', deleteCcosto);

export default router;

