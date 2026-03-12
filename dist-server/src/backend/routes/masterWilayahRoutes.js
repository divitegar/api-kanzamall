import { Router } from 'express';
import { getMstWilayah, getScWilayah } from '../controllers/MasterWilayahController.js';
const router = Router();
router.get('/mst-wilayah', getMstWilayah);
router.get('/mst-wilayah/:mst_wilayah_id', getScWilayah);
export default router;
