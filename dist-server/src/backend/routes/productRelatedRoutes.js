import { Router } from 'express';
import { getProductRelated } from '../controllers/productRelatedController.js';
const router = Router();
router.get('/product-related', getProductRelated);
router.get('/product-related/:product_id', getProductRelated);
export default router;
