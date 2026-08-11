import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { env } from './config/env';

const app = express();

// 1. Core middlewares
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Request logging
app.use((req, _res, next) => {
  console.log(`[API Request] ${req.method} ${req.path}`);
  next();
});

// 3. Bind versioned API routes
app.use('/api/v1', routes);

// 4. Default check route
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ARVA Smart Crop Advisory System Backend API is active',
    version: '1.0.0',
  });
});

// 5. Unhandled routes handler (404)
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// 6. Global error handler middleware
app.use(errorHandler);

export default app;
