import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { BroadcastScope, BroadcastPriority, BroadcastStatus, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const getBroadcasts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const whereClause: any = { status: BroadcastStatus.PUBLISHED };

    // Farmers only receive broadcasts targeting them
    if (req.user.role === Role.FARMER) {
      // Find farmer's region
      const farmer = await prisma.farmerProfile.findUnique({
        where: { id: req.user.id },
        select: { regionId: true },
      });

      if (farmer) {
        whereClause.OR = [
          { targetScope: BroadcastScope.NATIONWIDE },
          {
            AND: [
              { targetScope: BroadcastScope.REGIONAL },
              { targetRegionId: farmer.regionId },
            ],
          },
        ];
      } else {
        whereClause.targetScope = BroadcastScope.NATIONWIDE;
      }
    } else if (req.user.role === Role.OFFICER) {
      // Officers see nationwide or their assigned regions
      const officer = await prisma.officerProfile.findUnique({
        where: { id: req.user.id },
        include: { regions: true },
      });

      const regionIds = officer ? officer.regions.map((r) => r.id) : [];
      whereClause.OR = [
        { targetScope: BroadcastScope.NATIONWIDE },
        {
          AND: [
            { targetScope: BroadcastScope.REGIONAL },
            { targetRegionId: { in: regionIds } },
          ],
        },
        { authorId: req.user.id }, // Always let them see their own drafts/published
      ];
    }
    // Admins see all broadcasts

    const broadcasts = await prisma.broadcast.findMany({
      where: whereClause,
      include: {
        author: {
          select: { name: true, role: true },
        },
        targetRegion: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: broadcasts,
    });
  } catch (err) {
    next(err);
  }
};

export const createBroadcast = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { title, message, targetScope, targetRegionId, priority, status } = req.body;

  if (!title || !message || !targetScope) {
    return next(new AppError('Title, message, and target scope are required', 400));
  }

  try {
    // ENFORCE AUTHORIZATION SCOPE
    if (req.user.role === Role.OFFICER) {
      if (targetScope !== BroadcastScope.REGIONAL) {
        return next(new AppError('Forbidden: Officers can only publish Regional broadcasts', 403));
      }

      if (!targetRegionId) {
        return next(new AppError('Target region is required for regional broadcasts', 400));
      }

      // Check if officer is assigned to targetRegionId
      const assigned = await prisma.officerProfile.findFirst({
        where: {
          id: req.user.id,
          regions: {
            some: { id: targetRegionId },
          },
        },
      });

      if (!assigned) {
        return next(new AppError('Forbidden: You can only publish to regions within your jurisdiction', 403));
      }
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        title,
        message,
        authorId: req.user.id,
        authorRole: req.user.role,
        targetScope: targetScope as BroadcastScope,
        targetRegionId: targetScope === BroadcastScope.REGIONAL ? targetRegionId : null,
        priority: (priority as BroadcastPriority) || BroadcastPriority.MEDIUM,
        status: (status as BroadcastStatus) || BroadcastStatus.PUBLISHED,
      },
      include: {
        targetRegion: true,
      },
    });

    // Send notifications to farmers in scope if published
    if (broadcast.status === BroadcastStatus.PUBLISHED) {
      const farmerWhereClause: any = {};
      if (broadcast.targetScope === BroadcastScope.REGIONAL) {
        farmerWhereClause.regionId = broadcast.targetRegionId;
      }

      const targetedFarmers = await prisma.farmerProfile.findMany({
        where: farmerWhereClause,
        select: { id: true },
      });

      for (const farmer of targetedFarmers) {
        await createNotification(
          farmer.id,
          `New Broadcast: ${broadcast.title}`,
          broadcast.message.substring(0, 150),
          'BROADCAST',
          broadcast.id
        );
      }
    }

    res.status(201).json({
      status: 'success',
      data: broadcast,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBroadcast = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return next(new AppError('Broadcast not found', 404));
    }

    // Only author or admin can delete
    if (broadcast.authorId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Forbidden: You do not have permission to delete this broadcast', 403));
    }

    await prisma.broadcast.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Broadcast alert removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateBroadcast = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;
  const { title, message, targetScope, targetRegionId, priority, status } = req.body;

  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return next(new AppError('Broadcast not found', 404));
    }

    // Role-based auth checks
    if (req.user.role === Role.OFFICER) {
      // Officers can only edit their own broadcasts
      if (broadcast.authorId !== req.user.id) {
        return next(new AppError('Forbidden: You can only edit broadcasts created by you', 403));
      }

      // Officers cannot change targetScope to NATIONWIDE
      if (targetScope && targetScope !== BroadcastScope.REGIONAL) {
        return next(new AppError('Forbidden: Officers can only broadcast REGIONAL warnings', 403));
      }

      // If targetRegionId is changing, verify Officer jurisdiction
      if (targetRegionId && targetRegionId !== broadcast.targetRegionId) {
        const assigned = await prisma.officerProfile.findFirst({
          where: {
            id: req.user.id,
            regions: { some: { id: targetRegionId } },
          },
        });
        if (!assigned) {
          return next(new AppError('Forbidden: You can only target regions within your jurisdiction', 403));
        }
      }
    } else if (req.user.role !== Role.ADMIN) {
      return next(new AppError('Forbidden: Unauthorized role', 403));
    }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        title: title !== undefined ? title : broadcast.title,
        message: message !== undefined ? message : broadcast.message,
        targetScope: (targetScope !== undefined ? targetScope : broadcast.targetScope) as BroadcastScope,
        targetRegionId: targetScope === BroadcastScope.NATIONWIDE ? null : (targetRegionId !== undefined ? targetRegionId : broadcast.targetRegionId),
        priority: (priority !== undefined ? priority : broadcast.priority) as BroadcastPriority,
        status: (status !== undefined ? status : broadcast.status) as BroadcastStatus,
      },
      include: {
        targetRegion: true,
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
