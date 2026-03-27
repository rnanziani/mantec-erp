import { Router } from 'express';
import {
  getAllTallas,
  getTallaById,
  createTalla,
  updateTalla,
  deleteTalla
} from '../controllers/tallaController.js';

const router = Router();

router.get('/', getAllTallas);
router.get('/:id', getTallaById);
router.post('/', createTalla);
router.put('/:id', updateTalla);
router.delete('/:id', deleteTalla);

export default router;
