import { Response, NextFunction } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Role, UserStatus } from '@prisma/client';

export const getAdminDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const totalUsers = await prisma.user.count();
    const totalFarmers = await prisma.user.count({ where: { role: Role.FARMER } });
    const totalOfficers = await prisma.user.count({ where: { role: Role.OFFICER } });
    const totalAdmins = await prisma.user.count({ where: { role: Role.ADMIN } });
    const totalRegions = await prisma.region.count();
    
    // Real additional metrics
    const totalAppointments = await prisma.appointment.count();
    const totalPosts = await prisma.post.count();
    const pendingBanRequests = await prisma.banRequest.count({ where: { status: 'PENDING' } });
    const pendingTransferRequests = await prisma.transferRequest.count({ where: { status: 'PENDING' } });

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        totalFarmers,
        totalOfficers,
        totalAdmins,
        totalRegions,
        totalAppointments,
        totalPosts,
        pendingBanRequests,
        pendingTransferRequests,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phoneNumber: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { userId } = req.params;
  const { status } = req.body; // ACTIVE or BANNED

  if (userId === req.user.id) {
    return next(new AppError('You cannot ban or modify your own admin account status', 400));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { status: status as UserStatus },
        select: { id: true, email: true, status: true, role: true },
      });

      if (status === 'BANNED' && u.role === Role.OFFICER) {
        // Disconnect regions from banned officer
        await tx.officerProfile.update({
          where: { id: userId },
          data: {
            regions: {
              set: [],
            },
          },
        });
        
        // Clear primary officer assignment for all farmers under this officer
        await tx.farmerProfile.updateMany({
          where: { assignedOfficerId: userId },
          data: { assignedOfficerId: null },
        });
      }

      return u;
    });

    res.status(200).json({
      status: 'success',
      message: `User status changed to ${status}`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const createOfficerByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const {
    email,
    password,
    name,
    phoneNumber,
    regionIds,
    designation,
    qualification,
    callingTime,
    department,
    experience,
    availability,
    profilePictureUrl
  } = req.body;

  if (!email || !password || !name) {
    return next(new AppError('Email, password, and name are required to create an officer', 400));
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('A user with this email already exists', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newOfficer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: Role.OFFICER,
          status: UserStatus.ACTIVE,
          phoneNumber,
          profilePictureUrl: profilePictureUrl || null,
        },
      });

      // Create Officer Profile linked to specified regions
      await tx.officerProfile.create({
        data: {
          id: user.id,
          designation: designation || null,
          qualification: qualification || null,
          callingTime: callingTime || '9:00 AM - 5:00 PM',
          department: department || null,
          experience: experience || null,
          availability: availability || 'Available',
          regions: regionIds && regionIds.length > 0 ? {
            connect: regionIds.map((id: string) => ({ id })),
          } : undefined,
        },
      });

      return user;
    });

    res.status(201).json({
      status: 'success',
      message: 'Officer registered successfully',
      data: {
        id: newOfficer.id,
        email: newOfficer.email,
        name: newOfficer.name,
        role: newOfficer.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOfficersForAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const officers = await prisma.user.findMany({
      where: { role: Role.OFFICER },
      include: {
        officerProfile: {
          include: {
            regions: true,
            _count: {
              select: { farmers: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: officers.map((off) => ({
        id: off.id,
        name: off.name,
        email: off.email,
        phoneNumber: off.phoneNumber,
        profilePictureUrl: off.profilePictureUrl || null,
        status: off.status,
        createdAt: off.createdAt,
        designation: off.officerProfile?.designation || '',
        qualification: off.officerProfile?.qualification || '',
        callingTime: off.officerProfile?.callingTime || '9:00 AM - 5:00 PM',
        department: off.officerProfile?.department || '',
        experience: off.officerProfile?.experience || '',
        availability: off.officerProfile?.availability || 'Available',
        regions: off.officerProfile?.regions || [],
        farmerCount: off.officerProfile?._count.farmers || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const updateOfficerByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params;
  const {
    name,
    email,
    phoneNumber,
    status,
    regionIds,
    designation,
    qualification,
    callingTime,
    department,
    experience,
    availability,
    profilePictureUrl
  } = req.body;

  try {
    const existingOfficer = await prisma.user.findUnique({
      where: { id },
      include: {
        officerProfile: {
          include: { regions: true }
        }
      },
    });

    if (!existingOfficer || existingOfficer.role !== Role.OFFICER) {
      return next(new AppError('Officer not found', 404));
    }

    // Update user and profile in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update user
      await tx.user.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          email: email !== undefined ? email : undefined,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
          status: status !== undefined ? (status as UserStatus) : undefined,
          profilePictureUrl: profilePictureUrl !== undefined ? profilePictureUrl : undefined,
        },
      });

      // 2. Update profile
      await tx.officerProfile.update({
        where: { id },
        data: {
          designation: designation !== undefined ? designation : undefined,
          qualification: qualification !== undefined ? qualification : undefined,
          callingTime: callingTime !== undefined ? callingTime : undefined,
          department: department !== undefined ? department : undefined,
          experience: experience !== undefined ? experience : undefined,
          availability: availability !== undefined ? availability : undefined,
          regions: regionIds !== undefined ? {
            set: regionIds.map((rid: string) => ({ id: rid })),
          } : undefined,
        },
      });

      // 3. Auto-reassign affected farmers
      if (regionIds !== undefined) {
        const oldRegionIds = existingOfficer.officerProfile?.regions.map((r) => r.id) || [];
        const affectedRegionIds = Array.from(new Set([...oldRegionIds, ...regionIds]));

        const affectedFarmers = await tx.farmerProfile.findMany({
          where: { regionId: { in: affectedRegionIds } },
        });

        for (const farmer of affectedFarmers) {
          const activeOfficerForRegion = await tx.officerProfile.findFirst({
            where: {
              regions: { some: { id: farmer.regionId } },
            },
          });

          await tx.farmerProfile.update({
            where: { id: farmer.id },
            data: {
              assignedOfficerId: activeOfficerForRegion ? activeOfficerForRegion.id : null,
            },
          });
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Officer details and region coverage updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getAllRegions = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: [{ state: 'asc' }, { district: 'asc' }, { block: 'asc' }, { village: 'asc' }],
    });

    res.status(200).json({
      status: 'success',
      data: regions,
    });
  } catch (err) {
    next(err);
  }
};

export const createRegionByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { state, district, block, village } = req.body;
  if (!state || !district || !block || !village) {
    return next(new AppError('State, district, block, and village are required', 400));
  }

  try {
    const existing = await prisma.region.findFirst({
      where: { state, district, block, village },
    });

    if (existing) {
      return next(new AppError('This region coverage record already exists', 400));
    }

    const region = await prisma.region.create({
      data: { state, district, block, village },
    });

    res.status(201).json({
      status: 'success',
      data: region,
    });
  } catch (err) {
    next(err);
  }
};

export const updateRegionByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { state, district, block, village } = req.body;

  try {
    const region = await prisma.region.findUnique({ where: { id } });
    if (!region) {
      return next(new AppError('Region not found', 404));
    }

    const updated = await prisma.region.update({
      where: { id },
      data: { state, district, block, village },
    });

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRegionByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const region = await prisma.region.findUnique({ where: { id } });
    if (!region) {
      return next(new AppError('Region not found', 404));
    }

    await prisma.region.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: 'Region deleted successfully from coverage map',
    });
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    
    // Set default retention to 7 days if not set
    if (!settingsMap['notification_retention_days']) {
      settingsMap['notification_retention_days'] = '7';
    }
    
    res.status(200).json({
      status: 'success',
      data: settingsMap,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { notification_retention_days } = req.body;
  
  if (notification_retention_days === undefined) {
    return next(new AppError('notification_retention_days setting value is required', 400));
  }
  
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'notification_retention_days' },
      update: { value: String(notification_retention_days) },
      create: { key: 'notification_retention_days', value: String(notification_retention_days) },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'System settings updated successfully',
    });
  } catch (err) {
    next(err);
  }
};
