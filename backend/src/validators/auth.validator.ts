import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum([Role.FARMER], {
      errorMap: () => ({ message: 'Only FARMER registration is allowed' }),
    }).optional().default(Role.FARMER),
    language: z.string().optional().default('en'),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID Token is required'),
    role: z.enum([Role.FARMER]).optional().default(Role.FARMER),
  }),
});

export const onboardingSchema = z.object({
  body: z.object({
    address: z.string().min(5, 'Address must be at least 5 characters'),
    state: z.string().min(2, 'State is required'),
    district: z.string().min(2, 'District is required'),
    block: z.string().min(2, 'Block is required'),
    village: z.string().min(2, 'Village is required'),
    landSize: z.number().positive('Land size must be a positive number'),
    soilType: z.string().min(1, 'Soil type is required'),
    irrigationType: z.string().min(1, 'Irrigation type is required'),
    primaryCrop: z.string().min(1, 'Primary crop is required'),
    cropGrowthStage: z.string().min(1, 'Crop growth stage is required'),
  }),
});
