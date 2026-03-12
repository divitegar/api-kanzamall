import { Router } from 'express';
import { getWishlist, addWishlist, deleteWishlist } from '../controllers/wishlistController.js';

const router = Router();

router.get('/wishlist', getWishlist);
router.get('/wishlist/:customer_id', getWishlist);
router.post('/wishlist', addWishlist);
router.delete('/wishlist/:customer_id/:product_id', deleteWishlist);

export default router;
