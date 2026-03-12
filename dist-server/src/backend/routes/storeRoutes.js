import { Router } from 'express';
import { getStores, checkWilayah, changeStore, findStore } from '../controllers/storeController.js';
const router = Router();
router.get('/', getStores);
router.get('/check-wilayah', checkWilayah);
router.get('/change', changeStore);
router.get('/:id', findStore);
export default router;
