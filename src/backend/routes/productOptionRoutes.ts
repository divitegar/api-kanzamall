import { Router } from 'express';
import { getProductOptions } from '../controllers/productOptionController.js';

const router = Router();

router.get('/product-options', getProductOptions);
router.get('/product-options/:product_id', getProductOptions);

export default router;
