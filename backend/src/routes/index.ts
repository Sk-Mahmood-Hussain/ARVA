import { Router } from 'express';
import authRoutes from './auth.routes';
import regionRoutes from './region.routes';
import farmerRoutes from './farmer.routes';
import officerRoutes from './officer.routes';
import adminRoutes from './admin.routes';
import communityRoutes from './community.routes';
import schemeRoutes from './scheme.routes';
import broadcastRoutes from './broadcast.routes';
import appointmentRoutes from './appointment.routes';
import requestRoutes from './request.routes';
import notificationRoutes from './notification.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/regions', regionRoutes);
router.use('/farmers', farmerRoutes);
router.use('/officers', officerRoutes);
router.use('/admin', adminRoutes);
router.use('/community', communityRoutes);
router.use('/schemes', schemeRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/requests', requestRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai', aiRoutes);

export default router;
