import { Router } from 'express';
import { getOrganizationInfo, getServices, getCounters } from '../controllers/organizationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route for customer web app to fetch services by org ID
router.get('/:organizationId/services', getServices);

// Protected routes for desktop/admin app
router.get('/info', authenticate, getOrganizationInfo);
router.get('/counters', authenticate, getCounters);

export default router;
