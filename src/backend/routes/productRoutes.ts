import { Router } from 'express';
import { getProducts, getProductsByCategory, getProductDeals, searchProducts, getBestSellingProducts } from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/deals', getProductDeals);
router.get('/search', searchProducts);
router.get('/best-selling', getBestSellingProducts);
router.get('/category/:category_id', getProductsByCategory);

export default router;
