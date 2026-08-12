import { Router } from 'express';
import {
  getAdminDashboard,
  getAllUsers,
  toggleUserStatus,
  createOfficerByAdmin,
  getOfficersForAdmin,
  updateOfficerByAdmin,
  getAllRegions,
  createRegionByAdmin,
  updateRegionByAdmin,
  deleteRegionByAdmin,
  getSettings,
  updateSettings,
  getAdminAnalytics,
  deleteOfficerByAdmin,
  getOfficerRatingsSummary,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole([Role.ADMIN]));

router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', toggleUserStatus);

// Officer management
router.get('/officers', getOfficersForAdmin);
router.post('/officers', createOfficerByAdmin);
router.put('/officers/:id', updateOfficerByAdmin);
router.delete('/officers/:id', deleteOfficerByAdmin);
router.get('/officers/ratings', getOfficerRatingsSummary);

// Regions management
router.get('/regions', getAllRegions);
router.post('/regions', createRegionByAdmin);
router.put('/regions/:id', updateRegionByAdmin);
router.delete('/regions/:id', deleteRegionByAdmin);

// System Settings management
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

export default router;
