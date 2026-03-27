import { Router } from 'express';
import {
  getAllPatrones,
  getPatronById,
  createPatron,
  updatePatron,
  deletePatron
} from '../controllers/patronRotacionController.js';

const router = Router();

router.get('/', getAllPatrones);
router.get('/:id', getPatronById);
router.post('/', createPatron);
router.put('/:id', updatePatron);
router.delete('/:id', deletePatron);

export default router;
