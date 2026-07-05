import { Router } from 'express';
import { searchKomisi, getKomisiSummary, getKomisiTotal, getKomisiDetail } from '../controllers/komisiController.js';

const router = Router();

router.get('/komisi/search', searchKomisi);
router.get('/komisi/summary', getKomisiSummary);
router.get('/komisi/total', getKomisiTotal);
router.get('/komisi/detail', getKomisiDetail);

export default router;
