import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { SchemeStatus } from '@prisma/client';

export const getSchemes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { search, status } = req.query;

  try {
    const whereClause: any = {};

    // If not Admin, only show PUBLISHED schemes
    if (!req.user || req.user.role !== 'ADMIN') {
      whereClause.status = SchemeStatus.PUBLISHED;
    } else if (status) {
      whereClause.status = status as SchemeStatus;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { eligibility: { contains: search as string, mode: 'insensitive' } },
        { benefits: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const schemes = await prisma.scheme.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: schemes,
    });
  } catch (err) {
    next(err);
  }
};

export const getSchemeDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const scheme = await prisma.scheme.findUnique({
      where: { id },
    });

    if (!scheme) {
      return next(new AppError('Government scheme not found', 404));
    }

    // Farmer cannot view non-published schemes
    if ((!req.user || req.user.role !== 'ADMIN') && scheme.status !== SchemeStatus.PUBLISHED) {
      return next(new AppError('Forbidden: Access to this scheme is restricted', 403));
    }

    res.status(200).json({
      status: 'success',
      data: scheme,
    });
  } catch (err) {
    next(err);
  }
};

export const createScheme = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { title, description, eligibility, benefits, requiredDocuments, officialUrl, source, expiryDate, status } = req.body;

  if (!title || !description || !eligibility || !benefits || !officialUrl) {
    return next(new AppError('All core scheme parameters are required', 400));
  }

  try {
    const scheme = await prisma.scheme.create({
      data: {
        title,
        description,
        eligibility,
        benefits,
        requiredDocuments: requiredDocuments || [],
        officialUrl,
        source: source || 'Government Source',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: (status as SchemeStatus) || SchemeStatus.DRAFT,
      },
    });

    res.status(201).json({
      status: 'success',
      data: scheme,
    });
  } catch (err) {
    next(err);
  }
};

export const updateScheme = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { title, description, eligibility, benefits, requiredDocuments, officialUrl, source, expiryDate, status } = req.body;

  try {
    const existing = await prisma.scheme.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new AppError('Scheme not found', 404));
    }

    const updated = await prisma.scheme.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        eligibility: eligibility !== undefined ? eligibility : existing.eligibility,
        benefits: benefits !== undefined ? benefits : existing.benefits,
        requiredDocuments: requiredDocuments !== undefined ? requiredDocuments : existing.requiredDocuments,
        officialUrl: officialUrl !== undefined ? officialUrl : existing.officialUrl,
        source: source !== undefined ? source : existing.source,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existing.expiryDate,
        status: status !== undefined ? (status as SchemeStatus) : existing.status,
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

export const deleteScheme = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const existing = await prisma.scheme.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new AppError('Scheme not found', 404));
    }

    await prisma.scheme.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Government scheme deleted successfully from platform',
    });
  } catch (err) {
    next(err);
  }
};
