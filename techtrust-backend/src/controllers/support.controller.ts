/**
 * ============================================
 * SUPPORT CONTROLLER
 * ============================================
 * Handles customer support ticket system
 * Tickets route to admin dashboard
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';

// Generate ticket number: SUP-000001
async function generateTicketNumber(): Promise<string> {
  const count = await prisma.supportTicket.count();
  return `SUP-${String(count + 1).padStart(6, '0')}`;
}

/**
 * POST /tickets
 * Create a new support ticket (customer)
 */
export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { topic, subject, message, language } = req.body;

    if (!topic || !subject || !message) {
      throw new AppError('topic, subject and message are required', 400, 'VALIDATION_ERROR');
    }

    // Get customer language preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true, fullName: true },
    });

    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        topic,
        subject,
        language: language || user?.language?.toLowerCase() || 'en',
        status: 'OPEN',
        messages: {
          create: {
            senderId: userId,
            senderRole: 'CLIENT',
            message,
          },
        },
      },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const io = req.app.get('io');
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM_ALERT',
          title: `New Support Ticket ${ticketNumber}`,
          message: `${user?.fullName || 'Customer'}: ${subject}`,
          data: JSON.stringify({ ticketId: ticket.id, ticketNumber, topic, language: ticket.language }),
        },
      });

      if (io) {
        io.to(`user:${admin.id}`).emit('new_support_ticket', {
          ticketId: ticket.id,
          ticketNumber,
          topic,
          subject,
          language: ticket.language,
          customerName: user?.fullName,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets
 * List tickets for current user (customer sees own, admin sees all)
 */
export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, language: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, fullName: true, role: true } },
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:ticketId
 * Get ticket detail with all messages
 */
export const getTicketDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { ticketId } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, language: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    // Customers can only see their own tickets
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    // Mark messages as read
    if (user.role === 'ADMIN') {
      await prisma.supportMessage.updateMany({
        where: { ticketId, senderRole: 'CLIENT', isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      await prisma.supportMessage.updateMany({
        where: { ticketId, senderRole: { in: ['ADMIN', 'SYSTEM'] }, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets/:ticketId/messages
 * Send a message in a support ticket
 */
export const sendTicketMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message) {
      throw new AppError('message is required', 400, 'VALIDATION_ERROR');
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, status: true, ticketNumber: true },
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    // Check authorization
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    // Don't allow messages on closed tickets
    if (ticket.status === 'CLOSED') {
      throw new AppError('Ticket is closed', 400, 'TICKET_CLOSED');
    }

    const senderRole = user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT';

    const supportMessage = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: user.id,
        senderRole,
        message,
        attachments: attachments || [],
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Update ticket status based on who sent
    const newStatus = senderRole === 'ADMIN' ? 'WAITING_CUSTOMER' : 'WAITING_ADMIN';
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        assignedAdminId: senderRole === 'ADMIN' ? user.id : undefined,
      },
    });

    // Notify the other party
    const io = req.app.get('io');
    if (senderRole === 'CLIENT') {
      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      for (const admin of admins) {
        if (io) {
          io.to(`user:${admin.id}`).emit('support_message', {
            ticketId, ticketNumber: ticket.ticketNumber, message: supportMessage,
          });
        }
      }
    } else {
      // Notify customer
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SYSTEM_ALERT',
          title: `Support Reply - ${ticket.ticketNumber}`,
          message: message.substring(0, 100),
          data: JSON.stringify({ ticketId, ticketNumber: ticket.ticketNumber }),
        },
      });
      if (io) {
        io.to(`user:${ticket.userId}`).emit('support_message', {
          ticketId, ticketNumber: ticket.ticketNumber, message: supportMessage,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: supportMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /tickets/:ticketId/status
 * Update ticket status (admin only)
 */
export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const validStatuses = ['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const updateData: any = { status };
    if (status === 'RESOLVED') updateData.resolvedAt = new Date();
    if (status === 'CLOSED') updateData.closedAt = new Date();

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Notify customer
    if (status === 'RESOLVED' || status === 'CLOSED') {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SYSTEM_ALERT',
          title: `Ticket ${ticket.ticketNumber} ${status === 'RESOLVED' ? 'Resolved' : 'Closed'}`,
          message: `Your support ticket has been ${status.toLowerCase()}.`,
          data: JSON.stringify({ ticketId, ticketNumber: ticket.ticketNumber }),
        },
      });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/stats
 * Get support ticket statistics (admin only)
 */
export const getTicketStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, open, waitingAdmin, resolved, closed] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_ADMIN' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ]);

    // Unread messages count for admin
    const unreadMessages = await prisma.supportMessage.count({
      where: { senderRole: 'CLIENT', isRead: false },
    });

    res.json({
      success: true,
      data: { total, open, waitingAdmin, resolved, closed, unreadMessages },
    });
  } catch (error) {
    next(error);
  }
};
