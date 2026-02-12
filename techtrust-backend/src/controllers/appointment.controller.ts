/**
 * ============================================
 * APPOINTMENT CONTROLLER
 * ============================================
 * Manages diagnostic/estimate visit scheduling between
 * customers and providers (FDACS compliance).
 *
 * Endpoints:
 * - POST   /                  → Schedule appointment (customer)
 * - GET    /my                → List my appointments (customer or provider)
 * - GET    /:id               → Get appointment detail
 * - PATCH  /:id/confirm       → Provider confirms appointment
 * - PATCH  /:id/check-in      → Provider checks in on location
 * - PATCH  /:id/complete      → Complete appointment
 * - PATCH  /:id/cancel        → Cancel appointment
 * - GET    /provider/:id/slots → Get provider availability
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import { generateAppointmentNumber } from '../utils/number-generators';

// ============================================
// 1. SCHEDULE APPOINTMENT
// ============================================
export const scheduleAppointment = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const {
    providerId,
    vehicleId,
    serviceRequestId,
    scheduledDate,
    scheduledTime,
    estimatedDuration,
    serviceDescription,
    serviceType = 'DIAGNOSTIC',
    locationType = 'IN_SHOP',
    address,
    latitude,
    longitude,
    diagnosticFee = 0,
    travelFee = 0,
    feeWaivedOnService = true,
    customerNotes,
  } = req.body;

  // Validate provider exists and is a provider
  const provider = await prisma.user.findFirst({
    where: { id: providerId, role: 'PROVIDER', status: 'ACTIVE' },
    select: {
      id: true,
      fullName: true,
      providerProfile: {
        select: { businessName: true, serviceRadiusKm: true },
      },
    },
  });
  if (!provider) throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');

  // Validate vehicle belongs to customer
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: customerId },
    select: { id: true, make: true, model: true, year: true, plateNumber: true },
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');

  // Validate service request if provided
  if (serviceRequestId) {
    const sr = await prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, userId: customerId },
      select: { id: true },
    });
    if (!sr) throw new AppError('Service request not found', 404, 'SERVICE_REQUEST_NOT_FOUND');
  }

  // Validate scheduled date is in the future
  const schedDate = new Date(scheduledDate);
  if (schedDate <= new Date()) {
    throw new AppError('Scheduled date must be in the future', 400, 'INVALID_DATE');
  }

  const appointmentNumber = await generateAppointmentNumber();

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNumber,
      customerId,
      providerId,
      vehicleId,
      serviceRequestId: serviceRequestId || null,
      scheduledDate: schedDate,
      scheduledTime,
      estimatedDuration,
      serviceDescription,
      serviceType: serviceType as any,
      locationType,
      address,
      latitude,
      longitude,
      diagnosticFee,
      travelFee,
      feeWaivedOnService,
      customerNotes,
      status: 'REQUESTED',
    },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      provider: { select: { id: true, fullName: true } },
      vehicle: { select: { id: true, make: true, model: true, year: true, plateNumber: true } },
    },
  });

  // Notify provider
  await prisma.notification.create({
    data: {
      userId: providerId,
      type: 'APPOINTMENT_SCHEDULED',
      title: 'New Appointment Request',
      message: `A customer wants to schedule a diagnostic visit for their ${vehicle.year} ${vehicle.make} ${vehicle.model} on ${schedDate.toLocaleDateString()}.`,
      data: JSON.stringify({
        appointmentId: appointment.id,
        appointmentNumber,
        scheduledDate: schedDate.toISOString(),
        scheduledTime,
        locationType,
        vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      }),
    },
  });

  logger.info(`Appointment scheduled: ${appointmentNumber} by customer ${customerId} with provider ${providerId}`);

  return res.status(201).json({
    success: true,
    message: 'Appointment request submitted. Provider will confirm shortly.',
    data: { appointment },
  });
};

// ============================================
// 2. LIST MY APPOINTMENTS
// ============================================
export const getMyAppointments = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (role === 'PROVIDER') {
    where.providerId = userId;
  } else {
    where.customerId = userId;
  }
  if (status) {
    where.status = status as string;
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        provider: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            providerProfile: { select: { businessName: true } },
          },
        },
        vehicle: { select: { id: true, make: true, model: true, year: true, plateNumber: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      skip,
      take: limitNum,
    }),
    prisma.appointment.count({ where }),
  ]);

  return res.json({
    success: true,
    data: {
      appointments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
};

// ============================================
// 3. GET APPOINTMENT DETAIL
// ============================================
export const getAppointment = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, phone: true, email: true, avatarUrl: true } },
      provider: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          providerProfile: {
            select: {
              businessName: true,
              fdacsRegistrationNumber: true,
              address: true,
            },
          },
        },
      },
      vehicle: true,
      quotes: {
        select: {
          id: true,
          quoteNumber: true,
          estimateNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
      serviceRequest: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
  if (appointment.customerId !== userId && appointment.providerId !== userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  return res.json({ success: true, data: { appointment } });
};

// ============================================
// 4. PROVIDER CONFIRMS APPOINTMENT
// ============================================
export const confirmAppointment = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { providerNotes, suggestedDate, suggestedTime } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: { id, providerId, status: 'REQUESTED' },
    include: {
      customer: { select: { id: true, fullName: true } },
      vehicle: { select: { make: true, model: true, year: true } },
    },
  });

  if (!appointment) throw new AppError('Appointment not found or already processed', 404, 'NOT_FOUND');

  const updateData: any = {
    status: 'CONFIRMED',
    providerNotes,
  };

  // If provider suggests a different time
  if (suggestedDate) updateData.scheduledDate = new Date(suggestedDate);
  if (suggestedTime) updateData.scheduledTime = suggestedTime;

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Appointment Confirmed!',
      message: `Your diagnostic appointment for your ${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model} has been confirmed for ${updated.scheduledDate.toLocaleDateString()}${updated.scheduledTime ? ` at ${updated.scheduledTime}` : ''}.`,
      data: JSON.stringify({
        appointmentId: id,
        scheduledDate: updated.scheduledDate.toISOString(),
        scheduledTime: updated.scheduledTime,
      }),
    },
  });

  logger.info(`Appointment confirmed: ${appointment.appointmentNumber} by provider ${providerId}`);

  return res.json({
    success: true,
    message: 'Appointment confirmed.',
    data: { appointment: updated },
  });
};

// ============================================
// 5. PROVIDER CHECK-IN
// ============================================
export const checkInAppointment = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, providerId, status: 'CONFIRMED' },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment) throw new AppError('Appointment not found or not in confirmed state', 404, 'NOT_FOUND');

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'IN_PROGRESS',
      providerCheckedInAt: new Date(),
    },
  });

  // Notify customer that provider has arrived / started
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Provider Has Arrived',
      message: 'The provider has checked in and started the diagnostic inspection.',
      data: JSON.stringify({ appointmentId: id }),
    },
  });

  logger.info(`Provider checked in for appointment: ${appointment.appointmentNumber}`);

  return res.json({
    success: true,
    message: 'Checked in successfully.',
    data: { appointment: updated },
  });
};

// ============================================
// 6. COMPLETE APPOINTMENT
// ============================================
export const completeAppointment = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { providerNotes } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: { id, providerId, status: 'IN_PROGRESS' },
    include: {
      customer: { select: { id: true, fullName: true } },
      vehicle: { select: { make: true, model: true, year: true } },
    },
  });

  if (!appointment) throw new AppError('Appointment not found or not in progress', 404, 'NOT_FOUND');

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      providerNotes: providerNotes || appointment.providerNotes,
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: 'ESTIMATE_CREATED',
      title: 'Diagnostic Complete',
      message: `The diagnostic inspection for your ${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model} is complete. A Written Estimate will be sent shortly.`,
      data: JSON.stringify({ appointmentId: id }),
    },
  });

  logger.info(`Appointment completed: ${appointment.appointmentNumber}`);

  return res.json({
    success: true,
    message: 'Appointment completed. You can now create a Written Estimate.',
    data: { appointment: updated },
  });
};

// ============================================
// 7. CANCEL APPOINTMENT
// ============================================
export const cancelAppointment = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { reason } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      OR: [{ customerId: userId }, { providerId: userId }],
      status: { in: ['REQUESTED', 'CONFIRMED'] },
    },
    include: {
      customer: { select: { id: true, fullName: true } },
      provider: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment) throw new AppError('Appointment not found or cannot be cancelled', 404, 'NOT_FOUND');

  const cancelledBy = appointment.customerId === userId ? 'CUSTOMER' : 'PROVIDER';
  const notifyUserId = cancelledBy === 'CUSTOMER' ? appointment.providerId : appointment.customerId;

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason,
    },
  });

  // Notify other party
  await prisma.notification.create({
    data: {
      userId: notifyUserId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Appointment Cancelled',
      message: `The appointment ${appointment.appointmentNumber} has been cancelled by the ${cancelledBy.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`,
      data: JSON.stringify({ appointmentId: id, cancelledBy, reason }),
    },
  });

  logger.info(`Appointment cancelled: ${appointment.appointmentNumber} by ${cancelledBy}`);

  return res.json({
    success: true,
    message: 'Appointment cancelled.',
    data: { appointment: updated },
  });
};

// ============================================
// 8. GET PROVIDER SLOTS (public - for booking)
// ============================================
export const getProviderSlots = async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { date } = req.query; // e.g. "2026-02-15"

  // Check provider exists
  const provider = await prisma.user.findFirst({
    where: { id: providerId, role: 'PROVIDER', status: 'ACTIVE' },
    select: {
      id: true,
      fullName: true,
      providerProfile: {
        select: { businessName: true },
      },
    },
  });
  if (!provider) throw new AppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');

  // Get existing appointments for that date (to show busy slots)
  let dateFilter: any = {};
  if (date) {
    const d = new Date(date as string);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    dateFilter = {
      scheduledDate: { gte: start, lt: end },
    };
  }

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      providerId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      ...dateFilter,
    },
    select: {
      scheduledDate: true,
      scheduledTime: true,
      estimatedDuration: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  return res.json({
    success: true,
    data: {
      provider: {
        id: provider.id,
        name: provider.fullName,
        businessName: provider.providerProfile?.businessName,
      },
      bookedSlots: bookedAppointments,
    },
  });
};
