import { Router } from 'express';
import * as rewardController from '../controllers/rewardController.js';
const router = Router();
// Reward master/details
router.get('/rewards/dtlx', rewardController.getRewardDtlx);
router.get('/rewards/dtl', rewardController.getRewardDtl);
router.get('/rewards/mst', rewardController.getRewardMst);
// Point rewards
router.get('/point-rewards', rewardController.getPointRewards);
router.get('/point-rewards/:id', rewardController.getPointRewards);
// Pencairan
router.get('/pencairan', rewardController.getPencairan);
router.post('/pencairan', rewardController.storeCairReward);
// Update point cair
router.put('/point-reward/update', rewardController.updatePointcair);
router.put('/point-reward/update-dtl', rewardController.updatePointcair2);
// Customer / kode check
router.get('/customer', rewardController.getCustomer);
// Register specific points-komisi route before the param route to avoid route collision
router.get('/customer/points-komisi', rewardController.getCustomerPointsKomisi);
router.get('/customer/:customer_id', rewardController.getCustomer);
router.get('/cek-kode-kanza', rewardController.cekKodeKanza);
export default router;
