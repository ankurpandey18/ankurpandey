import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  login,
  logout,
  getMe,
  changePasswordHandler,
  forceChangePasswordHandler,
  getCsrfToken,
} from './auth.controller.js';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/config.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: config.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

router.post('/login', loginLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePasswordHandler);
router.post('/force-change-password', requireAuth, forceChangePasswordHandler);
router.get('/csrf-token', getCsrfToken);

export default router;
