/**
 * ============================================
 * APPOINTMENT ROUTES
 * ============================================
 * Diagnostic/Estimate visit scheduling
 */

import { Router } from "express";
import * as appointmentController from "../controllers/appointment.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(authenticate);

// Schedule an appointment (customer)
router.post("/", asyncHandler(appointmentController.scheduleAppointment));

// List my appointments (customer or provider)
router.get("/my", asyncHandler(appointmentController.getMyAppointments));

// Get provider available slots (for booking UI)
router.get(
  "/provider/:providerId/slots",
  asyncHandler(appointmentController.getProviderSlots),
);

// Get appointment detail
router.get("/:id", asyncHandler(appointmentController.getAppointment));

// Provider confirms appointment
router.patch(
  "/:id/confirm",
  asyncHandler(appointmentController.confirmAppointment),
);

// Provider checks in
router.patch(
  "/:id/check-in",
  asyncHandler(appointmentController.checkInAppointment),
);

// Complete appointment
router.patch(
  "/:id/complete",
  asyncHandler(appointmentController.completeAppointment),
);

// Cancel appointment (customer or provider)
router.patch(
  "/:id/cancel",
  asyncHandler(appointmentController.cancelAppointment),
);

export default router;
