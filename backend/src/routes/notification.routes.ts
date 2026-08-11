import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/:id', markAsRead);
router.post('/mark-all-read', markAllAsRead);

export default router;
