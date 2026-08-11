import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

import prisma from '../config/db';

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: Access token is missing or invalid', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: Role;
      name: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { status: true },
    });

    if (!user) {
      return next(new AppError('Unauthorized: User not found', 401));
    }

    if (user.status === 'BANNED') {
      return next(new AppError('Forbidden: Your account has been banned. Please contact admin.', 403));
    }

    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Unauthorized: Token has expired or is invalid', 401));
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: You do not have permission to access this resource', 403)
      );
    }

    next();
  };
};
