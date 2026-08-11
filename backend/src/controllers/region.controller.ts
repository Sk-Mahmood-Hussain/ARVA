import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getStates = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const states = await prisma.region.findMany({
      distinct: ['state'],
      select: { state: true },
    });
    res.status(200).json({
      status: 'success',
      data: states.map((s) => s.state),
    });
  } catch (err) {
    next(err);
  }
};

export const getDistricts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { state } = req.query;
  try {
    const districts = await prisma.region.findMany({
      where: state ? { state: state as string } : {},
      distinct: ['district'],
      select: { district: true },
    });
    res.status(200).json({
      status: 'success',
      data: districts.map((d) => d.district),
    });
  } catch (err) {
    next(err);
  }
};

export const getBlocks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { state, district } = req.query;
  try {
    const blocks = await prisma.region.findMany({
      where: {
        ...(state ? { state: state as string } : {}),
        ...(district ? { district: district as string } : {}),
      },
      distinct: ['block'],
      select: { block: true },
    });
    res.status(200).json({
      status: 'success',
      data: blocks.map((b) => b.block),
    });
  } catch (err) {
    next(err);
  }
};

export const getVillages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { state, district, block } = req.query;
  try {
    const villages = await prisma.region.findMany({
      where: {
        ...(state ? { state: state as string } : {}),
        ...(district ? { district: district as string } : {}),
        ...(block ? { block: block as string } : {}),
      },
      distinct: ['village'],
      select: { id: true, village: true },
    });
    res.status(200).json({
      status: 'success',
      data: villages,
    });
  } catch (err) {
    next(err);
  }
};
