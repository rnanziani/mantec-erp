import { Router } from 'express';
import {
  getAllTrazabilidadNeumatico,
  getTrazabilidadNeumaticoById,
  createTrazabilidadNeumatico,
  updateTrazabilidadNeumatico,
  deleteTrazabilidadNeumatico,
  generarActaTrazabilidadPDF,
} from '../controllers/trazabilidadNeumaticoController.js';

const router = Router();
router.get('/', getAllTrazabilidadNeumatico);
router.get('/:id/acta-pdf', generarActaTrazabilidadPDF);
router.get('/:id', getTrazabilidadNeumaticoById);
router.post('/', createTrazabilidadNeumatico);
router.put('/:id', updateTrazabilidadNeumatico);
router.delete('/:id', deleteTrazabilidadNeumatico);
export default router;
