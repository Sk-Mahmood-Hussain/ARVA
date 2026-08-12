import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../middlewares/error';
import { AuthenticatedRequest } from '../middlewares/auth';
import { fetchWeatherForecastForDistrict } from '../services/weather.service';
import { Role } from '@prisma/client';

const weatherCache: Record<string, { data: any; expiry: number }> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL

export const getWeatherData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    let district = (req.query.district as string) || '';

    // If district not supplied in query, resolve it by user role
    if (!district) {
      if (req.user.role === Role.FARMER) {
        const farmer = await prisma.farmerProfile.findUnique({
          where: { id: req.user.id },
          include: { region: true },
        });
        if (!farmer) {
          return next(new AppError('Farmer profile onboarding not completed yet.', 400));
        }
        district = farmer.region.district;
      } else if (req.user.role === Role.OFFICER) {
        const officer = await prisma.officerProfile.findUnique({
          where: { id: req.user.id },
          include: { regions: true },
        });
        if (!officer || officer.regions.length === 0) {
          return next(new AppError('Officer is not assigned to any regions.', 400));
        }
        district = officer.regions[0].district;
      } else if (req.user.role === Role.ADMIN) {
        // default admin weather district
        district = 'Ludhiana';
      }
    } else {
      // Validate that if officer is querying, they have jurisdiction
      if (req.user.role === Role.OFFICER) {
        const officer = await prisma.officerProfile.findUnique({
          where: { id: req.user.id },
          include: { regions: true },
        });
        const coveredDistricts = officer?.regions.map(r => r.district.toLowerCase()) || [];
        if (!coveredDistricts.includes(district.toLowerCase())) {
          return next(new AppError('Forbidden: You can only query weather inside your jurisdiction.', 403));
        }
      }
    }

    const normDistrict = district.trim().toLowerCase();
    const now = Date.now();
    const cached = weatherCache[normDistrict];

    if (cached && cached.expiry > now) {
      return res.status(200).json({
        status: 'success',
        data: cached.data,
      });
    }

    const weatherData = await fetchWeatherForecastForDistrict(district);

    weatherCache[normDistrict] = {
      data: weatherData,
      expiry: now + CACHE_TTL,
    };

    res.status(200).json({
      status: 'success',
      data: weatherData,
    });
  } catch (err) {
    next(err);
  }
};
