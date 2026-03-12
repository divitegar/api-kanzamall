import { Router } from 'express';
import { getStores, checkWilayah, changeStore, findStore } from '../controllers/aboutUsController.js';

const router = Router();

router.get('/stores', getStores);
router.get('/stores/check-wilayah', checkWilayah);
router.get('/stores/change', changeStore);
router.get('/stores/:id', findStore);

export default router;
