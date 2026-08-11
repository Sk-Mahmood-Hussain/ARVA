import { Router } from 'express';
import {
  getAppointments,
  requestAppointment,
  updateAppointmentStatus,
} from '../controllers/appointment.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', getAppointments);
router.post('/', requireRole([Role.FARMER]), requestAppointment);
router.patch('/:id', updateAppointmentStatus);

export default router;
