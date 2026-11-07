import { Router } from 'express';
import { getPedidoBot, patchPagoBot, patchPreciosBot } from '../controllers/pedidoBotController.js';

const router = Router();

router.get('/:id', getPedidoBot);
router.patch('/:id/precios', patchPreciosBot);
router.patch('/:id/pago', patchPagoBot);

export default router;
