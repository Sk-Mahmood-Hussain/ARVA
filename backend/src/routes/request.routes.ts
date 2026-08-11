import { Router } from 'express';
import {
  createBanRequest,
  createTransferRequest,
  getBanRequests,
  getTransferRequests,
  reviewBanRequest,
  reviewTransferRequest,
} from '../controllers/request.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.post('/ban', requireRole([Role.OFFICER, Role.FARMER]), createBanRequest);
router.post('/transfer', requireRole([Role.OFFICER]), createTransferRequest);

router.get('/ban', requireRole([Role.ADMIN]), getBanRequests);
router.get('/transfer', requireRole([Role.ADMIN]), getTransferRequests);

router.patch('/ban/:id', requireRole([Role.ADMIN]), reviewBanRequest);
router.patch('/transfer/:id', requireRole([Role.ADMIN]), reviewTransferRequest);

export default router;
