import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
	adminLogin,
	customerLogin,
	customerRegister,
	getCustomerById,
	customerUpdate,
	verifyCustomer,
	customerResendVerificationLink,
	customerForgotPassword,
	customerResendResetPasswordLink,
	validateCustomerResetPasswordToken,
	customerResetPassword
} from '../controllers/authController.js';

const router = Router();

const profileDir = path.join(process.cwd(), 'src', 'images', 'user', 'profile');
if (!fs.existsSync(profileDir)) {
	fs.mkdirSync(profileDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, profileDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
		const safeExt = ext.match(/^\.[a-z0-9]+$/i) ? ext : '.jpg';
		cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
	}
});

const uploadCustomerImage = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/admin/login', adminLogin);
router.post('/customer/login', customerLogin);
router.post('/customer/register', customerRegister);
router.get('/customer/verify', verifyCustomer);
router.post('/customer/resend-verification-link', customerResendVerificationLink);
router.post('/customer/forgot-password', customerForgotPassword); 
router.post('/customer/resend-reset-password-link', customerResendResetPasswordLink);
router.get('/customer/reset-password', validateCustomerResetPasswordToken);
router.post('/customer/reset-password', customerResetPassword);
router.post('/customer/update', uploadCustomerImage.single('image'), customerUpdate);
router.get('/customer/:customer_id', getCustomerById);

export default router;
