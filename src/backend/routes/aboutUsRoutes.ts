import { Router } from 'express';
import { getAbout } from '../controllers/aboutUsController.js';

const router = Router();

router.get('/', getAbout);

export default router;
