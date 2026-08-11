import prisma from '../config/db';
import { NotificationType } from '@prisma/client';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  referenceId?: string
) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        referenceId,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
