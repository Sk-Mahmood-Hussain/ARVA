import { Router } from 'express';
import {
  getBroadcasts,
  createBroadcast,
  deleteBroadcast,
  updateBroadcast,
} from '../controllers/broadcast.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', getBroadcasts);
router.post('/', requireRole([Role.ADMIN, Role.OFFICER]), createBroadcast);
router.patch('/:id', requireRole([Role.ADMIN, Role.OFFICER]), updateBroadcast);
router.delete('/:id', deleteBroadcast);

export default router;
