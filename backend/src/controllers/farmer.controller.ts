import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';

export const onboardFarmer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const {
    address,
    state,
    district,
    block,
    village,
    landSize,
    soilType,
    irrigationType,
    primaryCrop,
    cropGrowthStage,
  } = req.body;

  try {
    // 1. Find the region
    const region = await prisma.region.findUnique({
      where: {
        state_district_block_village: {
          state,
          district,
          block,
          village,
        },
      },
    });

    if (!region) {
      return next(
        new AppError(
          `Region not found in database: ${state}, ${district}, ${block}, ${village}`,
          404
        )
      );
    }

    // 2. Automatically assign Officer who is registered for this Region
    const assignedOfficer = await prisma.officerProfile.findFirst({
      where: {
        regions: {
          some: {
            id: region.id,
          },
        },
      },
    });

    // 3. Upsert FarmerProfile
    const profile = await prisma.farmerProfile.upsert({
      where: { id: req.user.id },
      update: {
        address,
        regionId: region.id,
        landSize,
        soilType,
        irrigationType,
        primaryCrop,
        cropGrowthStage,
        assignedOfficerId: assignedOfficer ? assignedOfficer.id : null,
      },
      create: {
        id: req.user.id,
        address,
        regionId: region.id,
        landSize,
        soilType,
        irrigationType,
        primaryCrop,
        cropGrowthStage,
        assignedOfficerId: assignedOfficer ? assignedOfficer.id : null,
      },
      include: {
        region: true,
        assignedOfficer: {
          include: {
            user: {
              select: { name: true, email: true, phoneNumber: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Farmer onboarding completed successfully',
      data: {
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getFarmerDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      include: {
        region: {
          include: {
            officers: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phoneNumber: true, profilePictureUrl: true },
                },
              },
            },
          },
        },
        assignedOfficer: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phoneNumber: true, profilePictureUrl: true },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(200).json({
        status: 'success',
        data: {
          onboardingCompleted: false,
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        onboardingCompleted: true,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getFarmerProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true, profilePictureUrl: true },
        },
        region: {
          include: {
            officers: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phoneNumber: true, profilePictureUrl: true },
                },
              },
            },
          },
        },
        assignedOfficer: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phoneNumber: true, profilePictureUrl: true },
            },
          },
        },
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

export const updateFarmerProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const {
    name,
    phoneNumber,
    address,
    state,
    district,
    block,
    village,
    landSize,
    soilType,
    irrigationType,
    primaryCrop,
    cropGrowthStage,
    language,
  } = req.body;

  try {
    // 1. Fetch current profile
    const currentProfile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id },
      include: { region: true },
    });

    if (!currentProfile) {
      return next(new AppError('Farmer profile not found', 404));
    }

    // Update base User model fields (name, phone, language)
    if (name || phoneNumber || language) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name || undefined,
          phoneNumber: phoneNumber || undefined,
          language: language || undefined,
        },
      });
    }

    let finalRegionId = currentProfile.regionId;
    let finalOfficerId = currentProfile.assignedOfficerId;

    // Check if region changed
    if (
      state && district && block && village &&
      (state !== currentProfile.region.state ||
        district !== currentProfile.region.district ||
        block !== currentProfile.region.block ||
        village !== currentProfile.region.village)
    ) {
      // Find new Region
      const region = await prisma.region.findUnique({
        where: {
          state_district_block_village: {
            state,
            district,
            block,
            village,
          },
        },
      });

      if (!region) {
        return next(
          new AppError(
            `Region not found in database: ${state}, ${district}, ${block}, ${village}`,
            404
          )
        );
      }

      finalRegionId = region.id;

      // Recalculate assigned officer based on backend jurisdiction assignment rules
      const assignedOfficer = await prisma.officerProfile.findFirst({
        where: {
          regions: {
            some: {
              id: region.id,
            },
          },
        },
      });

      finalOfficerId = assignedOfficer ? assignedOfficer.id : null;
    }

    // Update FarmerProfile details
    const updated = await prisma.farmerProfile.update({
      where: { id: req.user.id },
      data: {
        address: address !== undefined ? address : currentProfile.address,
        landSize: landSize !== undefined ? landSize : currentProfile.landSize,
        soilType: soilType !== undefined ? soilType : currentProfile.soilType,
        irrigationType: irrigationType !== undefined ? irrigationType : currentProfile.irrigationType,
        primaryCrop: primaryCrop !== undefined ? primaryCrop : currentProfile.primaryCrop,
        cropGrowthStage: cropGrowthStage !== undefined ? cropGrowthStage : currentProfile.cropGrowthStage,
        regionId: finalRegionId,
        assignedOfficerId: finalOfficerId,
      },
      include: {
        region: true,
        assignedOfficer: {
          include: {
            user: {
              select: { name: true, email: true, phoneNumber: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Farmer profile updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const rateOfficer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { id } = req.params; // officer id
  const { rating, reviewText } = req.body;

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return next(new AppError('Invalid rating value. Must be a number between 1 and 5.', 400));
  }

  try {
    const profile = await prisma.farmerProfile.findUnique({
      where: { id: req.user.id }
    });

    if (!profile) {
      return next(new AppError('Farmer profile not found. Please complete onboarding first.', 404));
    }

    // Verify officer is assigned to the farmer's region
    const officer = await prisma.officerProfile.findFirst({
      where: {
        id,
        regions: { some: { id: profile.regionId } }
      }
    });

    if (!officer) {
      return next(new AppError('Forbidden: You can only rate officers assigned to your region.', 403));
    }

    const review = await prisma.officerReview.upsert({
      where: {
        farmerId_officerId: {
          farmerId: req.user.id,
          officerId: id
        }
      },
      update: {
        rating,
        reviewText: reviewText || null
      },
      create: {
        farmerId: req.user.id,
        officerId: id,
        rating,
        reviewText: reviewText || null
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Officer rated successfully',
      data: review
    });
  } catch (err) {
    next(err);
  }
};
