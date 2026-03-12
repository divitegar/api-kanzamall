import { Router } from 'express';
import { getReviews, getCustomerReviews, saveReview } from '../controllers/reviewController.js';
const router = Router();
router.get('/reviews', getReviews);
router.get('/reviews/:product_id', getReviews);
router.get('/customer-reviews', getCustomerReviews);
router.get('/customer-reviews/:customer_id', getCustomerReviews);
router.post('/reviews', saveReview);
export default router;
