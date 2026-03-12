import { Router } from 'express';
import { getArticles, getArticleById } from '../controllers/articleController.js';
const router = Router();
// GET /api/articles - list published articles
// GET /api/articles?artikel_id=123 - get single article via query
router.get('/', getArticles);
// GET /api/articles/:artikel_id - get single article via path param
router.get('/:artikel_id', getArticleById);
export default router;
