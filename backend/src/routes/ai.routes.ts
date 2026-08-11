import { Router } from 'express';
import {
  startOrContinueChat,
  getConversations,
  getConversationDetails,
  deleteConversation,
  getAdvisory,
  escalateCase,
  getEscalatedCases,
  provideFeedbackOnCase,
  checkAIHealth,
  analyzeCropImage,
} from '../controllers/ai.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { aiRateLimiter } from '../middlewares/rateLimiter';
import { upload } from '../middlewares/upload';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

// Health check endpoint
router.get('/health', checkAIHealth);

// Chat endpoints (max 15 queries per minute)
router.post('/chat', aiRateLimiter(15, 60 * 1000), upload.single('image'), startOrContinueChat);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationDetails);
router.delete('/conversations/:id', deleteConversation);

// Crop leaf image diagnostic detection endpoint
router.post('/analyze-crop', upload.single('image'), analyzeCropImage);

// Advisory endpoint (max 5 compiles per minute)
router.get('/advisory', aiRateLimiter(5, 60 * 1000), getAdvisory);

// Escalation endpoints
router.post('/escalate', requireRole([Role.FARMER]), escalateCase);
router.get('/cases', getEscalatedCases);
router.patch('/cases/:id/feedback', requireRole([Role.OFFICER]), provideFeedbackOnCase);

export default router;
