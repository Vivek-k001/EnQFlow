import { Router } from 'express';
import { getOrganizationInfo, getServices, getCounters, getPrimaryOrganization } from '../controllers/organizationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes for customer web app
router.get('/primary', getPrimaryOrganization);
router.get('/:organizationId/services', getServices);

// Protected routes for desktop/admin app
router.get('/info', authenticate, getOrganizationInfo);
router.get('/counters', authenticate, getCounters);

export default router;
