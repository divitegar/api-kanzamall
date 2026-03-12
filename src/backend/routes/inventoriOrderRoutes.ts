import { Router } from 'express';
import {
  getOrders,
  saveOrderHistory,
  searchOrders,
  updateOrder,
  getCustMember,
  getKomisiOrders,
  saveKomisi
} from '../controllers/inventoriOrderController.js';

const router = Router();

router.get('/orders', getOrders);
router.get('/orders/:order_id', getOrders);
router.post('/orders/history', saveOrderHistory);
router.get('/orders/search', searchOrders);
router.put('/orders/:order_id', updateOrder);
router.get('/orders/customers', getCustMember);
router.get('/orders/komisi', getKomisiOrders);
router.post('/orders/komisi', saveKomisi);

export default router;
