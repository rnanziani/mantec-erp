import { Router } from 'express';
import {
  createLubricante,
  deleteLubricante,
  getAllLubricantes,
  getLubricanteById,
  updateLubricante,
} from '../controllers/lubricanteController.js';

const router = Router();

router.get('/', getAllLubricantes);
router.get('/:id', getLubricanteById);
router.post('/', createLubricante);
router.put('/:id', updateLubricante);
router.delete('/:id', deleteLubricante);

export default router;
