import { Router } from 'express';
import { getOrderProduk, getOrderHistory } from '../controllers/orderProductController.js';

const router = Router();

router.get('/order-product', getOrderProduk);
router.get('/order-product/:order_id', getOrderProduk);
router.get('/order-history', getOrderHistory);
router.get('/order-history/:order_id', getOrderHistory);

export default router;
