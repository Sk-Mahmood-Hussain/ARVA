import { Response, NextFunction } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middlewares/error';
import { Role, UserStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../config/cloudinary';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const generateToken = (userId: string, email: string, role: Role, name: string) => {
  return jwt.sign({ id: userId, email, role, name }, env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { email, password, name, language, phoneNumber } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create User and Profile
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: Role.FARMER,
          language: language || 'en',
          phoneNumber,
          status: UserStatus.ACTIVE,
        },
      });

      return user;
    });

    // 4. Generate token
    const token = generateToken(newUser.id, newUser.email, newUser.role, newUser.name);

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          status: newUser.status,
          language: newUser.language,
          profilePictureUrl: null,
          onboardingCompleted: false, // Farmer needs onboarding
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  try {
    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        farmerProfile: true,
      },
    });

    if (!user || !user.passwordHash) {
      return next(new AppError('Invalid email or password', 401));
    }

    // 2. Check status
    if (user.status === UserStatus.BANNED) {
      return next(new AppError('Your account has been banned. Please contact admin.', 403));
    }

    // 3. Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // 4. Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 5. Generate token
    const token = generateToken(user.id, user.email, user.role, user.name);

    const onboardingCompleted =
      user.role !== Role.FARMER || !!user.farmerProfile;

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          language: user.language,
          phoneNumber: user.phoneNumber || null,
          profilePictureUrl: user.profilePictureUrl || null,
          onboardingCompleted,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { idToken } = req.body;

  try {
    // 1. Verify token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      return next(new AppError('Invalid Google Token payload', 400));
    }

    const { email, name, sub: googleId } = payload;

    // 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { farmerProfile: true },
    });

    if (user) {
      // Check status
      if (user.status === UserStatus.BANNED) {
        return next(new AppError('Your account has been banned. Please contact admin.', 403));
      }

      // Link google ID if not linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: { farmerProfile: true },
        });
      }
    } else {
      // Create user
      const selectedRole = Role.FARMER;
      const newUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email,
            name,
            googleId,
            role: selectedRole,
            status: UserStatus.ACTIVE,
          },
        });

        return u;
      });
      user = { ...newUser, farmerProfile: null } as any;
    }

    if (!user) {
      return next(new AppError('Authentication failed', 500));
    }

    // 3. Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 4. Token
    const token = generateToken(user.id, user.email, user.role, user.name);

    const onboardingCompleted =
      user.role !== Role.FARMER || !!user.farmerProfile;

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          language: user.language || 'en',
          phoneNumber: user.phoneNumber || null,
          profilePictureUrl: user.profilePictureUrl || null,
          onboardingCompleted,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        farmerProfile: {
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
        },
        officerProfile: {
          include: {
            regions: true,
          },
        },
        adminProfile: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const onboardingCompleted =
      user.role !== Role.FARMER || !!user.farmerProfile;

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          language: user.language,
          phoneNumber: user.phoneNumber || null,
          profilePictureUrl: user.profilePictureUrl || null,
          onboardingCompleted,
          profile: user.role === Role.FARMER ? user.farmerProfile : user.role === Role.OFFICER ? user.officerProfile : user.adminProfile,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }
  if (!req.file) {
    return next(new AppError('Please select a photo file to upload', 400));
  }
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'arva_profiles');
    
    // Save URL to User in DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePictureUrl: url },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Profile photo uploaded successfully',
      data: {
        url,
      },
    });
  } catch (err) {
    next(err);
  }
};
