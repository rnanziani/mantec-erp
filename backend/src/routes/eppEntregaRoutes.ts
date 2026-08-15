import { Router } from 'express';
import {
  createEntregaEpp,
  deleteEntregaEpp,
  generarActaEntregaEppPDF,
  getActaDatosEntregaEpp,
  getAllEntregasEpp,
  getEntregaEppById,
  updateEntregaEpp,
} from '../controllers/eppEntregaController.js';

const router = Router();

router.get('/', getAllEntregasEpp);
router.get('/:id/acta-datos', getActaDatosEntregaEpp);
router.get('/:id/acta-pdf', generarActaEntregaEppPDF);
router.get('/:id', getEntregaEppById);
router.post('/', createEntregaEpp);
router.put('/:id', updateEntregaEpp);
router.delete('/:id', deleteEntregaEpp);

export default router;
