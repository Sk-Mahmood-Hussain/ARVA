import app from './app';
import { env } from './config/env';
import prisma from './config/db';

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 ARVA Backend API is running!`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

// Background Cleanup Task for Expired Notifications
const runNotificationCleanup = async () => {
  try {
    let retentionDays = 7;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'notification_retention_days' },
    });
    if (setting) {
      retentionDays = parseInt(setting.value, 10);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - retentionDays);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: expiryDate,
        },
      },
    });

    if (deleted.count > 0) {
      console.log(`[Scheduled Cleanup] Permanently deleted ${deleted.count} notifications older than ${retentionDays} days (${expiryDate.toISOString()})`);
    }
  } catch (err) {
    console.error('[Scheduled Cleanup Error] Failed to run notifications cleanup:', err);
  }
};

// Run cleanup immediately on startup
runNotificationCleanup();

// Run cleanup every 12 hours
const cleanupInterval = setInterval(runNotificationCleanup, 12 * 60 * 60 * 1000);

// Graceful shutdown handling
const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  clearInterval(cleanupInterval);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
