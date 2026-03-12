import { Router } from 'express';
import { adminLogin, customerLogin, customerRegister } from '../controllers/authController.js';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/customer/login', customerLogin);
router.post('/customer/register', customerRegister);

export default router;
