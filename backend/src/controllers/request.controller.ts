import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { RequestStatus, UserStatus, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

// ==========================================
// OFFICER - CREATE REQUESTS
// ==========================================

export const createBanRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || (req.user.role !== Role.OFFICER && req.user.role !== Role.FARMER)) {
    return next(new AppError('Only agriculture officers and farmers can submit ban requests', 403));
  }

  const { targetUserId, reason } = req.body;

  if (!targetUserId || !reason) {
    return next(new AppError('Target user ID and reason are required', 400));
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return next(new AppError('Target user not found', 404));
    }

    if (req.user.role === Role.OFFICER) {
      if (targetUser.role !== Role.FARMER) {
        return next(new AppError('Officers can only submit ban requests for farmers', 400));
      }
      
      // Verify farmer is assigned to officer
      const farmer = await prisma.farmerProfile.findFirst({
        where: {
          id: targetUserId,
          assignedOfficerId: req.user.id,
        },
      });

      if (!farmer) {
        return next(new AppError('Farmer not assigned to your jurisdiction', 400));
      }
    } else if (req.user.role === Role.FARMER) {
      if (targetUser.role !== Role.OFFICER) {
        return next(new AppError('Farmers can only submit reports/ban requests for officers', 400));
      }
    }

    const request = await prisma.banRequest.create({
      data: {
        requesterId: req.user.id,
        targetUserId,
        reason,
        status: RequestStatus.PENDING,
      },
    });

    // Notify Admins
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'New Ban Request Submitted',
        `Officer ${req.user.name} has requested to ban a farmer.`,
        'BAN_REQUEST',
        request.id
      );
    }

    res.status(201).json({
      status: 'success',
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

export const createTransferRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== Role.OFFICER) {
    return next(new AppError('Only agriculture officers can submit transfer requests', 403));
  }

  const { farmerId, reason, suggestedOfficerId } = req.body;

  if (!farmerId || !reason) {
    return next(new AppError('Farmer ID and reason are required', 400));
  }

  try {
    // Verify farmer is assigned to officer
    const farmer = await prisma.farmerProfile.findFirst({
      where: {
        id: farmerId,
        assignedOfficerId: req.user.id,
      },
    });

    if (!farmer) {
      return next(new AppError('Farmer not found or not assigned to your jurisdiction', 404));
    }

    const request = await prisma.transferRequest.create({
      data: {
        requesterId: req.user.id,
        farmerId,
        reason,
        suggestedOfficerId: suggestedOfficerId || null,
        status: RequestStatus.PENDING,
      },
    });

    // Notify Admins
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'New Farmer Transfer Request',
        `Officer ${req.user.name} requested transfer for a farmer.`,
        'TRANSFER_REQUEST',
        request.id
      );
    }

    res.status(201).json({
      status: 'success',
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADMIN - READ & REVIEW REQUESTS
// ==========================================

export const getBanRequests = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requests = await prisma.banRequest.findMany({
      include: {
        requester: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: requests,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransferRequests = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const requests = await prisma.transferRequest.findMany({
      include: {
        requester: { select: { name: true, email: true } },
        farmer: { select: { name: true, email: true } },
        suggestedOfficer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: requests,
    });
  } catch (err) {
    next(err);
  }
};

export const reviewBanRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body; // APPROVED or REJECTED

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return next(new AppError('Invalid status update. Must be APPROVED or REJECTED', 400));
  }

  try {
    const request = await prisma.banRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return next(new AppError('Ban request not found', 404));
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.banRequest.update({
        where: { id },
        data: {
          status: status as RequestStatus,
          adminNotes,
        },
      });

      if (status === 'APPROVED') {
        // Perform active Ban in database
        const targetUser = await tx.user.update({
          where: { id: request.targetUserId },
          data: { status: UserStatus.BANNED },
        });

        if (targetUser.role === Role.OFFICER) {
          // Disconnect regions from banned officer
          await tx.officerProfile.update({
            where: { id: request.targetUserId },
            data: {
              regions: {
                set: [],
              },
            },
          });
          
          // Clear primary officer assignment for all farmers under this officer
          await tx.farmerProfile.updateMany({
            where: { assignedOfficerId: request.targetUserId },
            data: { assignedOfficerId: null },
          });
        }
      }

      return reqUpdated;
    });

    // Notify Officer who requested
    await createNotification(
      request.requesterId,
      `Ban Request ${status}`,
      `Your request to ban user has been ${status.toLowerCase()}. Notes: ${adminNotes || 'None'}`,
      'SYSTEM',
      request.id
    );

    res.status(200).json({
      status: 'success',
      message: `Ban request marked as ${status}`,
      data: updatedRequest,
    });
  } catch (err) {
    next(err);
  }
};

export const reviewTransferRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { status, adminNotes, assignedOfficerId } = req.body; // APPROVED or REJECTED

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return next(new AppError('Invalid status update. Must be APPROVED or REJECTED', 400));
  }

  try {
    const request = await prisma.transferRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return next(new AppError('Transfer request not found', 404));
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.transferRequest.update({
        where: { id },
        data: {
          status: status as RequestStatus,
          adminNotes,
        },
      });

      if (status === 'APPROVED') {
        const finalOfficerId = assignedOfficerId || request.suggestedOfficerId;
        if (!finalOfficerId) {
          throw new AppError('An officer must be assigned to complete the transfer approval', 400);
        }

        // Perform Officer assignment update
        await tx.farmerProfile.update({
          where: { id: request.farmerId },
          data: { assignedOfficerId: finalOfficerId },
        });

        // Notify farmer
        await createNotification(
          request.farmerId,
          'Agriculture Officer Reassignment',
          'An Administrator has updated your designated Agriculture Officer.',
          'SYSTEM'
        );

        // Notify new officer
        await createNotification(
          finalOfficerId,
          'New Farmer Assignment',
          'A farmer has been transferred to your block directory.',
          'SYSTEM'
        );
      }

      return reqUpdated;
    });

    // Notify old officer who requested
    await createNotification(
      request.requesterId,
      `Transfer Request ${status}`,
      `Your farmer transfer request has been ${status.toLowerCase()}.`,
      'SYSTEM',
      request.id
    );

    res.status(200).json({
      status: 'success',
      message: `Transfer request marked as ${status}`,
      data: updatedRequest,
    });
  } catch (err) {
    next(err);
  }
};
