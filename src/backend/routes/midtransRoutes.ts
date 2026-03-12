import { Router } from 'express';
import { getApis, getApisActive, saveApi, updateApi } from '../controllers/midtransController.js';

const router = Router();

router.get('/midtrans', getApis);
router.get('/midtrans/active', getApisActive);
router.post('/midtrans', saveApi);
router.put('/midtrans/:order_id', updateApi);

export default router;
