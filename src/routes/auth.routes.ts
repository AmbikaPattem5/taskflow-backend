import { Router } from 'express';
import { register, login, getMe, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', validate(registerSchema, 'body'), register);
router.post('/login', validate(loginSchema, 'body'), login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', validate(forgotPasswordSchema, 'body'), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema, 'body'), resetPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema, 'body'), resetPassword);

export default router;
