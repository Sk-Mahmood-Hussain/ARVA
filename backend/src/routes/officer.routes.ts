import { Router } from 'express';
import {
  getOfficerDashboard,
  getAssignedFarmers,
  getFarmerDetailsForOfficer,
  getOfficerAnalytics,
  getOfficersList,
  updateOfficerProfileSelf,
} from '../controllers/officer.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/dashboard',
  requireAuth,
  requireRole([Role.OFFICER]),
  getOfficerDashboard
);

router.get(
  '/farmers',
  requireAuth,
  requireRole([Role.OFFICER]),
  getAssignedFarmers
);

router.get(
  '/list',
  requireAuth,
  requireRole([Role.OFFICER, Role.ADMIN]),
  getOfficersList
);

router.get(
  '/farmers/:id',
  requireAuth,
  requireRole([Role.OFFICER]),
  getFarmerDetailsForOfficer
);

router.get(
  '/analytics',
  requireAuth,
  requireRole([Role.OFFICER]),
  getOfficerAnalytics
);

router.put(
  '/profile',
  requireAuth,
  requireRole([Role.OFFICER]),
  updateOfficerProfileSelf
);

export default router;
