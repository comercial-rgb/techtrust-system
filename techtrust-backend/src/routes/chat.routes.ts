import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  markAllRead,
} from '../controllers/chat.controller';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// GET /conversations - List all conversations
router.get('/conversations', getConversations);

// GET /conversations/:conversationId - Get messages in a conversation
router.get('/conversations/:conversationId', getMessages);

// POST /messages - Send a new message
router.post('/messages', sendMessage);

// POST /messages/:messageId/read - Mark message as read
router.post('/messages/:messageId/read', markAsRead);

// POST /conversations/:conversationId/read-all - Mark all messages as read
router.post('/conversations/:conversationId/read-all', markAllRead);

export default router;
