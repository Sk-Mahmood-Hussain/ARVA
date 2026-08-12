import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppointmentStatus, Role, CaseStatus } from '@prisma/client';

export const getOfficerDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const officer = await prisma.officerProfile.findUnique({
      where: { id: req.user.id },
      include: {
        regions: true,
      },
    });

    if (!officer) {
      return next(new AppError('Officer profile not found', 404));
    }

    const regionIds = officer.regions.map((r) => r.id);

    // Get count of farmers in officer's regions
    const totalFarmers = await prisma.farmerProfile.count({
      where: { regionId: { in: regionIds } },
    });

    // Real database metrics
    const pendingAppointments = await prisma.appointment.count({
      where: { officerId: req.user.id, status: AppointmentStatus.PENDING },
    });

    const completedAppointments = await prisma.appointment.count({
      where: { officerId: req.user.id, status: AppointmentStatus.COMPLETED },
    });

    const activeFarmers = await prisma.farmerProfile.count({
      where: {
        regionId: { in: regionIds },
        user: { status: 'ACTIVE' },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newFarmers = await prisma.farmerProfile.count({
      where: {
        regionId: { in: regionIds },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const regionalBroadcasts = await prisma.broadcast.count({
      where: { authorId: req.user.id },
    });

    // 6-month farmer registration growth data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const farmersForGrowth = await prisma.farmerProfile.findMany({
      where: {
        regionId: { in: regionIds },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    const growthData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = farmersForGrowth.filter(f => {
        const fDate = new Date(f.createdAt);
        return fDate.getMonth() === month && fDate.getFullYear() === year;
      }).length;
      return { month: label, count };
    }).reverse();

    const diseaseReportsPending = await prisma.diseaseCase.count({
      where: { officerId: req.user.id, status: CaseStatus.PENDING },
    });

    const verifiedDiseaseReports = await prisma.diseaseCase.count({
      where: { officerId: req.user.id, status: CaseStatus.RESOLVED },
    });

    res.status(200).json({
      status: 'success',
      data: {
        regions: officer.regions,
        totalFarmers,
        activeFarmers,
        newFarmers,
        pendingAppointments,
        completedAppointments,
        regionalBroadcasts,
        growthData,
        diseaseReportsPending,
        verifiedDiseaseReports,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAssignedFarmers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { search } = req.query;

  try {
    const officer = await prisma.officerProfile.findUnique({
      where: { id: req.user.id },
      include: { regions: true },
    });

    if (!officer) {
      return next(new AppError('Officer profile not found', 404));
    }

    const regionIds = officer.regions.map((r) => r.id);

    const whereClause: any = {
      regionId: { in: regionIds },
    };

    if (search) {
      whereClause.user = {
        name: { contains: search as string, mode: 'insensitive' },
      };
    }

    const farmers = await prisma.farmerProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            status: true,
            lastLogin: true,
          },
        },
        region: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: farmers,
    });
  } catch (err) {
    next(err);
  }
};

export const getFarmerDetailsForOfficer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;

  try {
    const officer = await prisma.officerProfile.findUnique({
      where: { id: req.user.id },
      include: { regions: true },
    });

    if (!officer) {
      return next(new AppError('Officer profile not found', 404));
    }

    const regionIds = officer.regions.map((r) => r.id);

    const farmer = await prisma.farmerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true, status: true, lastLogin: true },
        },
        region: true,
      },
    });

    if (!farmer) {
      return next(new AppError('Farmer not found', 404));
    }

    // Backend-level regional authorization check
    if (!regionIds.includes(farmer.regionId)) {
      return next(new AppError('Forbidden: You do not have access to view farmers outside your region', 403));
    }

    // Retrieve historical appointments
    const appointments = await prisma.appointment.findMany({
      where: { farmerId: id, officerId: req.user.id },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        farmer,
        appointments,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOfficerAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const officer = await prisma.officerProfile.findUnique({
      where: { id: req.user.id },
      include: { regions: true },
    });

    if (!officer) {
      return next(new AppError('Officer profile not found', 404));
    }

    const regionIds = officer.regions.map((r) => r.id);

    // Assigned farmer count
    const totalFarmers = await prisma.farmerProfile.count({
      where: { regionId: { in: regionIds } },
    });

    // Active farmer count
    const activeFarmers = await prisma.farmerProfile.count({
      where: {
        regionId: { in: regionIds },
        user: { status: 'ACTIVE' },
      },
    });

    // New farmers (registered in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newFarmers = await prisma.farmerProfile.count({
      where: {
        regionId: { in: regionIds },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Farmer registration trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentFarmers = await prisma.farmerProfile.findMany({
      where: {
        regionId: { in: regionIds },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true }
    });

    const registrationTrend = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = recentFarmers.filter(f => {
        const fDate = new Date(f.createdAt);
        return fDate.getMonth() === month && fDate.getFullYear() === year;
      }).length;
      return { month: label, count };
    }).reverse();

    // Disease cases
    const totalDiseaseCases = await prisma.diseaseCase.count({
      where: { officerId: req.user.id },
    });
    const pendingDiseaseCases = await prisma.diseaseCase.count({
      where: { officerId: req.user.id, status: CaseStatus.PENDING },
    });
    const verifiedDiseaseCases = await prisma.diseaseCase.count({
      where: { officerId: req.user.id, status: CaseStatus.RESOLVED },
    });

    // Appointments stats
    const totalAppointments = await prisma.appointment.count({
      where: { officerId: req.user.id },
    });
    const completedAppointments = await prisma.appointment.count({
      where: { officerId: req.user.id, status: AppointmentStatus.COMPLETED },
    });
    const pendingAppointments = await prisma.appointment.count({
      where: { officerId: req.user.id, status: AppointmentStatus.PENDING },
    });

    // Regional broadcasts
    const regionalBroadcasts = await prisma.broadcast.count({
      where: { authorId: req.user.id },
    });

    // Community activity in officer's region
    const communityPostsCount = await prisma.post.count({
      where: {
        author: {
          farmerProfile: {
            regionId: { in: regionIds },
          },
        },
      },
    });

    // Farmer distribution by village in jurisdiction
    const regionsWithFarmers = await prisma.region.findMany({
      where: { id: { in: regionIds } },
      include: {
        _count: {
          select: { farmers: true }
        }
      }
    });

    const villageDistribution = regionsWithFarmers.map(r => ({
      village: r.village,
      block: r.block,
      farmerCount: r._count.farmers
    }));

    res.status(200).json({
      status: 'success',
      data: {
        totalFarmers,
        activeFarmers,
        newFarmers,
        registrationTrend,
        totalDiseaseCases,
        pendingDiseaseCases,
        verifiedDiseaseCases,
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        regionalBroadcasts,
        communityPostsCount,
        villageDistribution
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOfficersList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const list = await prisma.user.findMany({
      where: { role: Role.OFFICER, status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

export const updateOfficerProfileSelf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const userId = req.user.id;
  const {
    name,
    phoneNumber,
    language,
    designation,
    qualification,
    callingTime,
    department,
    experience,
    availability
  } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update user fields
      await tx.user.update({
        where: { id: userId },
        data: {
          name: name !== undefined ? name : undefined,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
          language: language !== undefined ? language : undefined,
        },
      });

      // 2. Update/upsert officer profile details
      await tx.officerProfile.upsert({
        where: { id: userId },
        update: {
          designation: designation !== undefined ? designation : undefined,
          qualification: qualification !== undefined ? qualification : undefined,
          callingTime: callingTime !== undefined ? callingTime : undefined,
          department: department !== undefined ? department : undefined,
          experience: experience !== undefined ? experience : undefined,
          availability: availability !== undefined ? availability : undefined,
        },
        create: {
          id: userId,
          designation: designation || null,
          qualification: qualification || null,
          callingTime: callingTime || '9:00 AM - 5:00 PM',
          department: department || null,
          experience: experience || null,
          availability: availability || 'Available',
        },
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Officer profile details updated successfully',
    });
  } catch (err) {
    next(err);
  }
};
