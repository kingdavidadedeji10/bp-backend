import express from 'express';
import { login, register, verifyOTPHandler } from '../controllers/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5 // limit each IP to 5 OTP requests per hour
});

router.post('/login', otpLimiter, login);
router.post('/register', apiLimiter, register);
router.post('/verify-otp', apiLimiter, verifyOTPHandler);

export default router;