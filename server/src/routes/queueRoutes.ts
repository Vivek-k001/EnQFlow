import { Router } from 'express';
import { 
  createQueueRequest, 
  getQueueRequest, 
  getPendingRequests, 
  approveRequest, 
  declineRequest, 
  getTicket, 
  callNext, 
  updateTicketStatus,
  getQueueTickets,
  getActiveServingTickets
} from '../controllers/queueController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes for customers
router.post('/organizations/:organizationId/requests', createQueueRequest);
router.get('/requests/:requestId', getQueueRequest);
router.get('/tickets/:ticketId', getTicket);

// Protected routes for receptionists
router.get('/requests', authenticate, getPendingRequests);
router.get('/tickets', authenticate, getQueueTickets);
router.get('/active', authenticate, getActiveServingTickets);
router.post('/requests/:id/approve', authenticate, approveRequest);
router.post('/requests/:id/decline', authenticate, declineRequest);

router.post('/call-next', authenticate, callNext);
router.post('/tickets/:id/status', authenticate, updateTicketStatus);

export default router;

