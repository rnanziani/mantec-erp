import { Router } from 'express';
import {
  createCodigoEtiqueta,
  getAllCodigosEtiqueta,
  importarCodigosEtiqueta,
  updateCodigoEtiqueta,
} from '../controllers/codigoEtiquetaController.js';

const router = Router();

router.get('/', getAllCodigosEtiqueta);
router.post('/importar', importarCodigosEtiqueta);
router.post('/', createCodigoEtiqueta);
router.put('/:id', updateCodigoEtiqueta);

export default router;
