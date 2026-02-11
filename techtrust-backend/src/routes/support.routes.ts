import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createTicket,
  getTickets,
  getTicketDetail,
  sendTicketMessage,
  updateTicketStatus,
  getTicketStats,
} from '../controllers/support.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer + Admin: create ticket, list tickets, get detail, send message
router.post('/tickets', createTicket);
router.get('/tickets', getTickets);
router.get('/tickets/:ticketId', getTicketDetail);
router.post('/tickets/:ticketId/messages', sendTicketMessage);

// Admin only: update status, get stats
router.patch('/tickets/:ticketId/status', authorize('ADMIN'), updateTicketStatus);
router.get('/stats', authorize('ADMIN'), getTicketStats);

export default router;
