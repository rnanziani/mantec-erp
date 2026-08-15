import { Router } from 'express';
import {
  createTipoEpp,
  deleteTipoEpp,
  getAllTiposEpp,
  getTipoEppById,
  updateTipoEpp,
} from '../controllers/eppTipoController.js';

const router = Router();

router.get('/', getAllTiposEpp);
router.get('/:id', getTipoEppById);
router.post('/', createTipoEpp);
router.put('/:id', updateTipoEpp);
router.delete('/:id', deleteTipoEpp);

export default router;
