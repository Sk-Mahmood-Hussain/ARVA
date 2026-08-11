import { Router } from 'express';
import {
  onboardFarmer,
  getFarmerDashboard,
  getFarmerProfile,
  updateFarmerProfile,
} from '../controllers/farmer.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { onboardingSchema } from '../validators/auth.validator';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/onboard',
  requireAuth,
  requireRole([Role.FARMER]),
  validateRequest(onboardingSchema),
  onboardFarmer
);

router.get(
  '/dashboard',
  requireAuth,
  requireRole([Role.FARMER]),
  getFarmerDashboard
);

router.get(
  '/profile',
  requireAuth,
  requireRole([Role.FARMER]),
  getFarmerProfile
);

router.patch(
  '/profile',
  requireAuth,
  requireRole([Role.FARMER]),
  updateFarmerProfile
);

export default router;
