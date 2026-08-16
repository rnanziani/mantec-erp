import { Router } from 'express';
import {
  createClaseEpp,
  deleteClaseEpp,
  getAllClasesEpp,
  getClaseEppById,
  updateClaseEpp,
} from '../controllers/eppClaseController.js';

const router = Router();

router.get('/', getAllClasesEpp);
router.get('/:id', getClaseEppById);
router.post('/', createClaseEpp);
router.put('/:id', updateClaseEpp);
router.delete('/:id', deleteClaseEpp);

export default router;
