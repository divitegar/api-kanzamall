import { Router } from 'express';
import { getCategories, getCategoryDescription } from '../controllers/categoryController.js';

const router = Router();

// GET /api/categories
router.get('/categories', getCategories);
router.get('/categories/:category_id', getCategories);

// GET /api/categories/description or /api/categories/description/:category_id
router.get('/categories/description', getCategoryDescription);
router.get('/categories/description/:category_id', getCategoryDescription);

export default router;
