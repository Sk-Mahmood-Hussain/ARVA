import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppointmentStatus, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const getAppointments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    let whereClause: any = {};

    if (req.user.role === Role.FARMER) {
      whereClause.farmerId = req.user.id;
    } else if (req.user.role === Role.OFFICER) {
      whereClause.officerId = req.user.id;
    }
    // Admin sees all

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        farmer: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        officer: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
};

export const requestAppointment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== Role.FARMER) {
    return next(new AppError('Only farmers can schedule appointments', 403));
  }

  const { date, reason } = req.body;

  if (!date || !reason) {
    return next(new AppError('Date and consultation reason are required', 400));
  }

  try {
    // Find assigned officer
    const farmer = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      select: { assignedOfficerId: true },
    });

    if (!farmer || !farmer.assignedOfficerId) {
      return next(new AppError('You do not have a designated Agriculture Officer assigned to your region yet.', 400));
    }

    const appointment = await prisma.appointment.create({
      data: {
        farmerId: req.user.id,
        officerId: farmer.assignedOfficerId,
        date: new Date(date),
        reason,
        status: AppointmentStatus.PENDING,
      },
    });

    // Notify Officer
    await createNotification(
      farmer.assignedOfficerId,
      'New Appointment Request',
      `Farmer ${req.user.name} has requested a consultation on ${new Date(date).toLocaleDateString()}`,
      'APPOINTMENT',
      appointment.id
    );

    res.status(201).json({
      status: 'success',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppointmentStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;
  const { status, consultationNotes, rescheduleDate } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    // Role checks
    if (req.user.role === Role.FARMER) {
      // Farmer can only CANCEL
      if (status !== AppointmentStatus.CANCELLED) {
        return next(new AppError('Forbidden: Farmers can only cancel appointments', 403));
      }
      if (appointment.farmerId !== req.user.id) {
        return next(new AppError('Forbidden: You can only modify your own appointments', 403));
      }
    } else if (req.user.role === Role.OFFICER) {
      if (appointment.officerId !== req.user.id) {
        return next(new AppError('Forbidden: You can only manage appointments requested to you', 403));
      }
    }

    const updateData: any = { status: status as AppointmentStatus };

    if (consultationNotes !== undefined) {
      updateData.consultationNotes = consultationNotes;
    }

    if (rescheduleDate && status === AppointmentStatus.RESCHEDULED) {
      updateData.date = new Date(rescheduleDate);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    // Notify counterpart
    if (req.user.role === Role.OFFICER) {
      let msg = `Your appointment has been marked as ${status}`;
      if (status === AppointmentStatus.RESCHEDULED) {
        msg = `Your appointment has been rescheduled to ${new Date(updateData.date).toLocaleDateString()}`;
      }
      await createNotification(
        appointment.farmerId,
        `Appointment Status Update: ${status}`,
        msg,
        'APPOINTMENT',
        appointment.id
      );
    } else if (req.user.role === Role.FARMER && status === AppointmentStatus.CANCELLED) {
      await createNotification(
        appointment.officerId,
        'Appointment Cancelled',
        `Farmer ${req.user.name} has cancelled their appointment scheduled for ${new Date(appointment.date).toLocaleDateString()}`,
        'APPOINTMENT',
        appointment.id
      );
    }

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
