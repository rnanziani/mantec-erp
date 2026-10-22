import { Router } from 'express';
import {
  anularBitacora,
  createBitacora,
  deleteBitacora,
  getAllBitacoras,
  getBitacoraById,
  getVerificadorFlota,
  registrarRegreso,
  updateBitacora,
} from '../controllers/bitacoraViajeController.js';

const router = Router();

router.get('/', getAllBitacoras);
router.get('/verificador', getVerificadorFlota);
router.get('/:id', getBitacoraById);
router.post('/', createBitacora);
router.put('/:id', updateBitacora);
router.post('/:id/regreso', registrarRegreso);
router.post('/:id/anular', anularBitacora);
router.delete('/:id', deleteBitacora);

export default router;
