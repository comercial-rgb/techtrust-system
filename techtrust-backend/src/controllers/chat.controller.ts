/**
 * ============================================
 * CHAT CONTROLLER
 * ============================================
 * Handles customer-provider messaging
 * Each conversation is linked to a service request
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';

// Generate conversation ID from two user IDs + optional context
function buildConversationId(userA: string, userB: string, serviceRequestId?: string): string {
  const sorted = [userA, userB].sort();
  const base = `${sorted[0]}_${sorted[1]}`;
  return serviceRequestId ? `${base}_${serviceRequestId}` : base;
}

/**
 * GET /conversations
 * List all conversations for the authenticated user
 */
export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    // Get distinct conversations with latest message
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: { id: true, fullName: true, role: true, providerProfile: { select: { businessName: true } } },
        },
        toUser: {
          select: { id: true, fullName: true, role: true, providerProfile: { select: { businessName: true } } },
        },
        serviceRequest: {
          select: { id: true, requestNumber: true, title: true, status: true },
        },
      },
    });

    // Group by conversationId to get unique conversations
    const conversationMap = new Map<string, any>();
    for (const msg of messages) {
      const convId = msg.conversationId || buildConversationId(msg.fromUserId, msg.toUserId, msg.serviceRequestId || undefined);
      if (!conversationMap.has(convId)) {
        const otherUser = msg.fromUserId === userId ? msg.toUser : msg.fromUser;
        const unreadCount = messages.filter(
          m => m.conversationId === convId && m.toUserId === userId && !m.isRead
        ).length;

        conversationMap.set(convId, {
          conversationId: convId,
          otherUser: {
            id: otherUser.id,
            name: otherUser.providerProfile?.businessName || otherUser.fullName,
            role: otherUser.role,
          },
          serviceRequest: msg.serviceRequest || null,
          lastMessage: {
            id: msg.id,
            message: msg.message,
            createdAt: msg.createdAt,
            fromUserId: msg.fromUserId,
            isRead: msg.isRead,
          },
          unreadCount,
        });
      }
    }

    const conversations = Array.from(conversationMap.values());

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /conversations/:conversationId
 * Get messages for a specific conversation
 */
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        fromUser: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    const total = await prisma.chatMessage.count({
      where: {
        conversationId,
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
    });

    // Mark unread messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        toUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /messages
 * Send a new chat message
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { toUserId, message, workOrderId, serviceRequestId, attachments } = req.body;

    if (!toUserId || !message) {
      throw new AppError('toUserId and message are required', 400, 'VALIDATION_ERROR');
    }

    const conversationId = buildConversationId(userId, toUserId, serviceRequestId);

    const chatMessage = await prisma.chatMessage.create({
      data: {
        fromUserId: userId,
        toUserId,
        message,
        conversationId,
        workOrderId: workOrderId || null,
        serviceRequestId: serviceRequestId || null,
        attachments: attachments || [],
      },
      include: {
        fromUser: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Emit via Socket.IO for real-time delivery
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${toUserId}`).emit('receive_message', {
        ...chatMessage,
        conversationId,
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: 'CHAT_MESSAGE',
        title: 'New Message',
        message: `New message from ${chatMessage.fromUser.fullName}`,
        data: JSON.stringify({
          conversationId,
          messageId: chatMessage.id,
          fromUserId: userId,
          serviceRequestId,
        }),
      },
    });

    res.status(201).json({
      success: true,
      data: chatMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /messages/:messageId/read
 * Mark a message as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { messageId } = req.params;

    await prisma.chatMessage.updateMany({
      where: {
        id: messageId,
        toUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /conversations/:conversationId/read-all
 * Mark all messages in a conversation as read
 */
export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;

    const result = await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        toUserId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true, updated: result.count });
  } catch (error) {
    next(error);
  }
};
