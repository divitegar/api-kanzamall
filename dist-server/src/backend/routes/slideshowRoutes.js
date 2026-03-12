import { Router } from 'express';
import { getSlideshows } from '../controllers/slideshowController.js';
const router = Router();
router.get('/', getSlideshows);
export default router;
