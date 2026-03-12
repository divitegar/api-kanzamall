import { Router } from 'express';
import { getOngkir, getResi, trackingResi, pickup } from '../controllers/ongkirController.js';

const router = Router();

router.get('/ongkir', getOngkir);
router.get('/resi/:order_id', getResi);
router.get('/tracking/:awb', trackingResi);
router.post('/pickup/:order_id', pickup);

export default router;
