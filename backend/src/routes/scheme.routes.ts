import { Router } from 'express';
import {
  getSchemes,
  getSchemeDetails,
  createScheme,
  updateScheme,
  deleteScheme,
} from '../controllers/scheme.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', getSchemes);
router.get('/:id', getSchemeDetails);

router.post('/', requireRole([Role.ADMIN]), createScheme);
router.patch('/:id', requireRole([Role.ADMIN]), updateScheme);
router.delete('/:id', requireRole([Role.ADMIN]), deleteScheme);

export default router;
