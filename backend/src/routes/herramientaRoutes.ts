import { Router } from 'express';
import {
  createHerramienta,
  deleteHerramienta,
  generarReporteHerramientasPDF,
  getAllHerramientas,
  getHerramientaById,
  getReporteHerramientasDatos,
  updateHerramienta,
} from '../controllers/herramientaController.js';

const router = Router();

router.get('/', getAllHerramientas);
router.get('/reporte/datos', getReporteHerramientasDatos);
router.get('/reporte/pdf', generarReporteHerramientasPDF);
router.get('/:id', getHerramientaById);
router.post('/', createHerramienta);
router.put('/:id', updateHerramienta);
router.delete('/:id', deleteHerramienta);

export default router;
