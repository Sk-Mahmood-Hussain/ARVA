import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  getCurrentUser,
  uploadProfilePhoto,
} from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validation';
import { requireAuth } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/google', validateRequest(googleLoginSchema), googleLogin);
router.get('/me', requireAuth, getCurrentUser);
router.post('/profile-photo', requireAuth, upload.single('photo'), uploadProfilePhoto);

export default router;
