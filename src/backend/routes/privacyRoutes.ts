import { Router } from 'express';
import { getPrivacy } from '../controllers/privacyController.js';

const router = Router();

router.get('/privacy', getPrivacy);
router.get('/privacy/:privacy_policy_id', getPrivacy);

export default router;
