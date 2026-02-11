import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/notifications
 * List user's notifications (most recent first)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: notifications.map((n) => ({
        ...n,
        data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
      })),
    });
  }),
);

/**
 * GET /api/v1/notifications/counts
 * Get unread counts for badges
 */
router.get(
  '/counts',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const [unreadNotifications, unreadMessages, pendingRequests] = await Promise.all([
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.chatMessage.count({
        where: {
          toUserId: userId,
          isRead: false,
        },
      }),
      prisma.serviceRequest.count({
        where: {
          userId,
          status: { in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        unreadNotifications,
        unreadMessages,
        pendingRequests,
      },
    });
  }),
);

/**
 * POST /api/v1/notifications/:notificationId/read
 * Mark a single notification as read
 */
router.post(
  '/:notificationId/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  }),
);

/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.post(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  }),
);

export default router;
