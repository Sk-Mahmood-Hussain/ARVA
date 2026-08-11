import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../config/cloudinary';
import { Role } from '@prisma/client';

export const getPosts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { category, search, sort = 'recent', page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause: any = {};

    if (category) {
      whereClause.category = category as string;
    }

    if (search) {
      whereClause.OR = [
        { content: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
        { author: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Determine sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { likes: { _count: 'desc' } };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            select: { id: true, name: true, role: true, email: true },
          },
          likes: {
            select: { userId: true },
          },
          _count: {
            select: { comments: true, likes: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.post.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        posts: posts.map((post) => ({
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          hasLiked: req.user ? post.likes.some((l) => l.userId === req.user!.id) : false,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPostDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, role: true, email: true },
        },
        likes: {
          select: { userId: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        hasLiked: req.user ? post.likes.some((l) => l.userId === req.user!.id) : false,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createPost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { content, category, location } = req.body;

  if (!content || !category) {
    return next(new AppError('Content and crop category are required', 400));
  }

  try {
    let imageUrl: string | undefined = undefined;

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, 'arva_community');
    }

    const post = await prisma.post.create({
      data: {
        content,
        category,
        location: location || 'General',
        imageUrl,
        authorId: req.user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;
  const { content, category, location } = req.body;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    if (post.authorId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Forbidden: You can only edit your own posts', 403));
    }

    let imageUrl = post.imageUrl;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, 'arva_community');
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        content: content || post.content,
        category: category || post.category,
        location: location || post.location,
        imageUrl,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    if (post.authorId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Forbidden: You can only delete your own posts', 403));
    }

    await prisma.post.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Post deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const toggleLikePost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id: postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    let liked = false;
    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: { userId, postId },
        },
      });
    } else {
      await prisma.like.create({
        data: { userId, postId },
      });
      liked = true;
    }

    res.status(200).json({
      status: 'success',
      data: { liked },
    });
  } catch (err) {
    next(err);
  }
};

export const createComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id: postId } = req.params;
  const { content } = req.body;

  if (!content) {
    return next(new AppError('Comment content is required', 400));
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId: req.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: comment,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }

    if (comment.userId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Forbidden: You can only delete your own comments', 403));
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getFarmerPublicProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, phoneNumber: true },
        },
        region: true,
      },
    });

    if (!profile) {
      return next(new AppError('Farmer profile not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};
