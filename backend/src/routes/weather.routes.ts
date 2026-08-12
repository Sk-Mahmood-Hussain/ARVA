import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { getWeatherData } from '../controllers/weather.controller';

const router = Router();

router.get('/', requireAuth, getWeatherData);

export default router;
