import { Router } from 'express';
import {
  createCategoriaEpp,
  deleteCategoriaEpp,
  getAllCategoriasEpp,
  getCategoriaEppById,
  updateCategoriaEpp,
} from '../controllers/eppCategoriaController.js';

const router = Router();

router.get('/', getAllCategoriasEpp);
router.get('/:id', getCategoriaEppById);
router.post('/', createCategoriaEpp);
router.put('/:id', updateCategoriaEpp);
router.delete('/:id', deleteCategoriaEpp);

export default router;
