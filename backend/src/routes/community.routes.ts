import { Router } from 'express';
import {
  getPosts,
  getPostDetails,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  createComment,
  deleteComment,
  getFarmerPublicProfile,
} from '../controllers/community.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', getPosts);
router.get('/:id', getPostDetails);
router.post('/', requireRole([Role.FARMER]), upload.single('image'), createPost);
router.patch('/:id', upload.single('image'), updatePost);
router.delete('/:id', deletePost);

router.post('/:id/like', toggleLikePost);
router.post('/:id/comments', createComment);
router.delete('/comments/:id', deleteComment);

router.get('/farmer/:id', getFarmerPublicProfile);

export default router;
