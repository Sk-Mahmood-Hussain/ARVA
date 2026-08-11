import { Router } from 'express';
import {
  getStates,
  getDistricts,
  getBlocks,
  getVillages,
} from '../controllers/region.controller';

const router = Router();

router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/blocks', getBlocks);
router.get('/villages', getVillages);

export default router;
