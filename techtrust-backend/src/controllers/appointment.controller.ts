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

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { generateAppointmentNumber } from "../utils/number-generators";
import {
  CANCELLATION_RULES,
  PROVIDER_POINTS,
} from "../config/businessRules";

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
    serviceType = "DIAGNOSTIC",
    locationType = "IN_SHOP",
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
    where: { id: providerId, role: "PROVIDER", status: "ACTIVE" },
    select: {
      id: true,
      fullName: true,
      providerProfile: {
        select: { businessName: true, serviceRadiusKm: true },
      },
    },
  });
  if (!provider)
    throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");

  // Validate vehicle belongs to customer
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: customerId },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      plateNumber: true,
    },
  });
  if (!vehicle)
    throw new AppError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");

  // Validate service request if provided
  if (serviceRequestId) {
    const sr = await prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, userId: customerId },
      select: { id: true },
    });
    if (!sr)
      throw new AppError(
        "Service request not found",
        404,
        "SERVICE_REQUEST_NOT_FOUND",
      );
  }

  // Validate scheduled date is in the future
  const schedDate = new Date(scheduledDate);
  if (schedDate <= new Date()) {
    throw new AppError(
      "Scheduled date must be in the future",
      400,
      "INVALID_DATE",
    );
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
      status: "REQUESTED",
    },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      provider: { select: { id: true, fullName: true } },
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          plateNumber: true,
        },
      },
    },
  });

  // Notify provider
  await prisma.notification.create({
    data: {
      userId: providerId,
      type: "APPOINTMENT_SCHEDULED",
      title: "New Appointment Request",
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

  logger.info(
    `Appointment scheduled: ${appointmentNumber} by customer ${customerId} with provider ${providerId}`,
  );

  return res.status(201).json({
    success: true,
    message: "Appointment request submitted. Provider will confirm shortly.",
    data: { appointment },
  });
};

// ============================================
// 2. LIST MY APPOINTMENTS
// ============================================
export const getMyAppointments = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const { status, page = "1", limit = "20" } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (role === "PROVIDER") {
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
        customer: {
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            providerProfile: { select: { businessName: true } },
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            plateNumber: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
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
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          avatarUrl: true,
        },
      },
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

  if (!appointment)
    throw new AppError("Appointment not found", 404, "APPOINTMENT_NOT_FOUND");
  if (appointment.customerId !== userId && appointment.providerId !== userId) {
    throw new AppError("Not authorized", 403, "FORBIDDEN");
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
    where: { id, providerId, status: "REQUESTED" },
    include: {
      customer: { select: { id: true, fullName: true } },
      vehicle: { select: { make: true, model: true, year: true } },
    },
  });

  if (!appointment)
    throw new AppError(
      "Appointment not found or already processed",
      404,
      "NOT_FOUND",
    );

  const updateData: any = {
    status: "CONFIRMED",
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
      type: "APPOINTMENT_CONFIRMED",
      title: "Appointment Confirmed!",
      message: `Your diagnostic appointment for your ${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model} has been confirmed for ${updated.scheduledDate.toLocaleDateString()}${updated.scheduledTime ? ` at ${updated.scheduledTime}` : ""}.`,
      data: JSON.stringify({
        appointmentId: id,
        scheduledDate: updated.scheduledDate.toISOString(),
        scheduledTime: updated.scheduledTime,
      }),
    },
  });

  logger.info(
    `Appointment confirmed: ${appointment.appointmentNumber} by provider ${providerId}`,
  );

  return res.json({
    success: true,
    message: "Appointment confirmed.",
    data: { appointment: updated },
  });
};

// ============================================
// 4.5 PROVIDER EN ROUTE
// ============================================
export const providerEnRoute = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { estimatedArrivalMinutes } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: { id, providerId, status: "CONFIRMED" },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment)
    throw new AppError(
      "Appointment not found or not in confirmed state",
      404,
      "NOT_FOUND",
    );

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "PROVIDER_EN_ROUTE" as any,
      providerEnRouteAt: new Date(),
    },
  });

  // Notify customer that provider is on the way
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: "APPOINTMENT_CONFIRMED",
      title: "Provider Is On The Way",
      message: estimatedArrivalMinutes
        ? `Your provider is on the way! Estimated arrival: ${estimatedArrivalMinutes} minutes.`
        : "Your provider is on the way!",
      data: JSON.stringify({
        appointmentId: id,
        estimatedArrivalMinutes,
      }),
    },
  });

  logger.info(
    `Provider en route for appointment: ${appointment.appointmentNumber}`,
  );

  return res.json({
    success: true,
    message: "Provider en route status set.",
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
    where: {
      id,
      providerId,
      status: { in: ["CONFIRMED", "PROVIDER_EN_ROUTE"] as any },
    },
    include: {
      customer: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment)
    throw new AppError(
      "Appointment not found or not ready for check-in",
      404,
      "NOT_FOUND",
    );

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      providerCheckedInAt: new Date(),
    },
  });

  // Notify customer that provider has arrived / started
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: "APPOINTMENT_CONFIRMED",
      title: "Provider Has Arrived",
      message:
        "The provider has checked in and started the diagnostic inspection.",
      data: JSON.stringify({ appointmentId: id }),
    },
  });

  logger.info(
    `Provider checked in for appointment: ${appointment.appointmentNumber}`,
  );

  return res.json({
    success: true,
    message: "Checked in successfully.",
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
    where: { id, providerId, status: "IN_PROGRESS" },
    include: {
      customer: { select: { id: true, fullName: true } },
      vehicle: { select: { id: true, make: true, model: true, year: true, plateNumber: true } },
    },
  });

  if (!appointment)
    throw new AppError(
      "Appointment not found or not in progress",
      404,
      "NOT_FOUND",
    );

  // BUG 2 FIX: Auto-create ServiceRequest if none is linked
  let serviceRequestId = appointment.serviceRequestId;

  if (!serviceRequestId) {
    const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        requestNumber,
        userId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        serviceType: appointment.serviceType || "DIAGNOSTIC",
        title: `Diagnostic: ${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`,
        description: appointment.serviceDescription || "Diagnostic inspection completed",
        serviceLocationType: appointment.locationType || "IN_SHOP",
        customerAddress: appointment.address || null,
        serviceLatitude: appointment.latitude,
        serviceLongitude: appointment.longitude,
        status: "QUOTES_RECEIVED",
        maxQuotes: 5,
      },
    });

    serviceRequestId = serviceRequest.id;

    // Link the appointment to the new ServiceRequest
    await prisma.appointment.update({
      where: { id },
      data: { serviceRequestId },
    });

    logger.info(
      `Auto-created ServiceRequest ${requestNumber} from diagnostic appointment ${appointment.appointmentNumber}`,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      providerNotes: providerNotes || appointment.providerNotes,
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: appointment.customerId,
      type: "ESTIMATE_CREATED",
      title: "Diagnostic Complete",
      message: `The diagnostic inspection for your ${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model} is complete. A Written Estimate will be sent shortly.`,
      data: JSON.stringify({ appointmentId: id, serviceRequestId }),
    },
  });

  logger.info(`Appointment completed: ${appointment.appointmentNumber}`);

  return res.json({
    success: true,
    message: "Appointment completed. You can now create a Written Estimate.",
    data: { appointment: updated, serviceRequestId },
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
      status: { in: ["REQUESTED", "CONFIRMED"] },
    },
    include: {
      customer: { select: { id: true, fullName: true } },
      provider: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment)
    throw new AppError(
      "Appointment not found or cannot be cancelled",
      404,
      "NOT_FOUND",
    );

  const cancelledBy =
    appointment.customerId === userId ? "CUSTOMER" : "PROVIDER";
  const notifyUserId =
    cancelledBy === "CUSTOMER"
      ? appointment.providerId
      : appointment.customerId;

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason,
    },
  });

  // Notify other party
  await prisma.notification.create({
    data: {
      userId: notifyUserId,
      type: "APPOINTMENT_CANCELLED",
      title: "Appointment Cancelled",
      message: `The appointment ${appointment.appointmentNumber} has been cancelled by the ${cancelledBy.toLowerCase()}.${reason ? ` Reason: ${reason}` : ""}`,
      data: JSON.stringify({ appointmentId: id, cancelledBy, reason }),
    },
  });

  logger.info(
    `Appointment cancelled: ${appointment.appointmentNumber} by ${cancelledBy}`,
  );

  return res.json({
    success: true,
    message: "Appointment cancelled.",
    data: { appointment: updated },
  });
};

// ============================================
// 8. GET PROVIDER SLOTS (public - for booking)
// ============================================
export const getProviderSlots = async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { date } = req.query; // e.g. "2026-02-15"

  // Check provider exists + get business hours
  const provider = await prisma.user.findFirst({
    where: { id: providerId, role: "PROVIDER", status: "ACTIVE" },
    select: {
      id: true,
      fullName: true,
      providerProfile: {
        select: {
          businessName: true,
          businessHours: true,
        },
      },
    },
  });
  if (!provider)
    throw new AppError("Provider not found", 404, "PROVIDER_NOT_FOUND");

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
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      ...dateFilter,
    },
    select: {
      scheduledDate: true,
      scheduledTime: true,
      estimatedDuration: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Parse business hours to generate available slots
  const businessHours = provider.providerProfile?.businessHours as any;
  let availableSlots: string[] = [];

  if (date && businessHours) {
    const dayOfWeek = new Date(date as string)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    // Support formats: { monday: { open: "08:00", close: "17:00" } }
    // or { monday: { start: "08:00", end: "17:00" } }
    const dayHours = businessHours[dayOfWeek];

    if (dayHours && (dayHours.open || dayHours.start)) {
      const openTime = dayHours.open || dayHours.start;
      const closeTime = dayHours.close || dayHours.end;

      const [openH] = openTime.split(":").map(Number);
      const [closeH, closeM] = closeTime.split(":").map(Number);

      const bookedTimes = new Set(
        bookedAppointments
          .filter((a) => a.scheduledTime)
          .map((a) => a.scheduledTime),
      );

      // Generate 1-hour slots
      for (let h = openH; h < closeH || (h === closeH && 0 < closeM); h++) {
        const slot = `${String(h).padStart(2, "0")}:00`;
        if (!bookedTimes.has(slot)) {
          availableSlots.push(slot);
        }
      }
    }
  }

  return res.json({
    success: true,
    data: {
      provider: {
        id: provider.id,
        name: provider.fullName,
        businessName: provider.providerProfile?.businessName,
      },
      bookedSlots: bookedAppointments,
      availableSlots,
      businessHours: businessHours || null,
    },
  });
};

// ============================================
// 9. REPORT PROVIDER NO-SHOW
// ============================================

/**
 * POST /api/v1/appointments/:id/no-show
 * Customer or admin reports that the provider didn't show up.
 * Applies progressive hold: 24h for first offense, +24h for each subsequent.
 * Penalty: -50 reputation points per no-show.
 * Auto-suspends if reputation drops below -100.
 */
export const reportProviderNoShow = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { reason } = req.body;

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      customerId: userId,
      status: { in: ["CONFIRMED", "PROVIDER_EN_ROUTE"] as any },
    },
    include: {
      provider: {
        select: {
          id: true,
          fullName: true,
          providerProfile: {
            select: {
              noShowCount: true,
              reputationPoints: true,
              suspendedAt: true,
            },
          },
        },
      },
      customer: { select: { id: true, fullName: true } },
    },
  });

  if (!appointment) {
    throw new AppError(
      "Appointment not found or not in a valid state for no-show report",
      404,
      "NOT_FOUND",
    );
  }

  const providerId = appointment.providerId;
  const profile = appointment.provider.providerProfile;
  const currentNoShowCount = profile?.noShowCount ?? 0;
  const newNoShowCount = currentNoShowCount + 1;

  // Progressive hold: first offense 24h, then +24h per subsequent offense
  const noShowConfig = CANCELLATION_RULES.PROVIDER_CANCEL.NO_SHOW;
  const holdHours =
    noShowConfig.HOLD_HOURS_FIRST_OFFENSE +
    (currentNoShowCount * noShowConfig.HOLD_INCREMENT_HOURS);
  const holdUntil = new Date(Date.now() + holdHours * 60 * 60 * 1000);

  // Apply all changes in a transaction
  await prisma.$transaction([
    // Mark appointment as NO_SHOW
    prisma.appointment.update({
      where: { id },
      data: {
        status: "NO_SHOW",
        cancelledAt: new Date(),
        cancellationReason: reason || "Provider no-show",
        cancelledBy: "SYSTEM",
      },
    }),

    // Update provider profile: increment noShowCount, apply points penalty, set hold
    prisma.providerProfile.update({
      where: { userId: providerId },
      data: {
        noShowCount: newNoShowCount,
        reputationPoints: { increment: noShowConfig.PROVIDER_POINTS_PENALTY },
        // Hold the provider from new appointments until holdUntil
        suspendedUntil: holdUntil,
        suspensionReason: `No-show #${newNoShowCount}: held for ${holdHours}h until ${holdUntil.toISOString()}`,
      },
    }),

    // Notify provider
    prisma.notification.create({
      data: {
        userId: providerId,
        type: "SYSTEM_ALERT",
        title: "No-Show Reported",
        message: `A no-show has been reported for appointment ${appointment.appointmentNumber}. ${noShowConfig.PROVIDER_POINTS_PENALTY} reputation points applied. You are on hold for ${holdHours} hours (until ${holdUntil.toLocaleDateString()}).`,
        data: JSON.stringify({
          appointmentId: id,
          noShowCount: newNoShowCount,
          pointsPenalty: noShowConfig.PROVIDER_POINTS_PENALTY,
          holdHours,
          holdUntil: holdUntil.toISOString(),
        }),
      },
    }),

    // Notify customer
    prisma.notification.create({
      data: {
        userId: appointment.customerId,
        type: "APPOINTMENT_CANCELLED",
        title: "No-Show Confirmed",
        message: `The provider did not show up for your appointment. We've taken action and you can schedule with another provider.`,
        data: JSON.stringify({ appointmentId: id }),
      },
    }),
  ]);

  // Check auto-suspension threshold
  const updatedPoints = (profile?.reputationPoints ?? 0) + noShowConfig.PROVIDER_POINTS_PENALTY;
  if (updatedPoints <= PROVIDER_POINTS.AUTO_SUSPENSION_THRESHOLD && !profile?.suspendedAt) {
    await prisma.$transaction([
      prisma.providerProfile.update({
        where: { userId: providerId },
        data: {
          suspendedAt: new Date(),
          suspensionReason: `Auto-suspended: reputation points (${updatedPoints}) below threshold (${PROVIDER_POINTS.AUTO_SUSPENSION_THRESHOLD})`,
        },
      }),
      prisma.user.update({
        where: { id: providerId },
        data: { status: "SUSPENDED" },
      }),
      prisma.notification.create({
        data: {
          userId: providerId,
          type: "SYSTEM_ALERT",
          title: "Account Suspended",
          message: `Your account has been suspended due to repeated no-shows and low reputation score (${updatedPoints} points). Contact support for reinstatement.`,
        },
      }),
    ]);

    logger.warn(`Provider ${providerId} AUTO-SUSPENDED after no-show #${newNoShowCount}`);
  }

  logger.info(
    `No-show reported: appointment ${appointment.appointmentNumber}, provider ${providerId}, count=${newNoShowCount}, hold=${holdHours}h`,
  );

  return res.json({
    success: true,
    message: "No-show report submitted. Provider has been penalized.",
    data: {
      noShowCount: newNoShowCount,
      pointsPenalty: noShowConfig.PROVIDER_POINTS_PENALTY,
      holdHours,
      holdUntil: holdUntil.toISOString(),
    },
  });
};
