import { Router } from 'express';
import { adminLogin, customerLogin, customerRegister, getCustomerById } from '../controllers/authController.js';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/customer/login', customerLogin);
router.post('/customer/register', customerRegister);
router.get('/customer/:customer_id', getCustomerById);

export default router;
