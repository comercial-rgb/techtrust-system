import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import * as sos from "../controllers/sos.controller";

const router = Router();

// ── Client routes ─────────────────────────────────────────────────────────────
// All require authentication as CLIENT
router.post(
  "/request",
  authenticate,
  authorize("CLIENT"),
  asyncHandler(sos.createSOSRequest),
);
router.get(
  "/request/:requestId/status",
  authenticate,
  authorize("CLIENT"),
  asyncHandler(sos.getSOSStatus),
);
router.post(
  "/request/:requestId/confirm",
  authenticate,
  authorize("CLIENT"),
  asyncHandler(sos.confirmSOSAccept),
);
router.post(
  "/request/:requestId/decline",
  authenticate,
  authorize("CLIENT"),
  asyncHandler(sos.declineSOSAccept),
);
router.delete(
  "/request/:requestId",
  authenticate,
  authorize("CLIENT"),
  asyncHandler(sos.cancelSOSRequest),
);

// ── Provider routes ───────────────────────────────────────────────────────────
// All require authentication as PROVIDER
router.get(
  "/nearby",
  authenticate,
  authorize("PROVIDER"),
  asyncHandler(sos.getNearbySOSRequests),
);
router.post(
  "/:requestId/accept",
  authenticate,
  authorize("PROVIDER"),
  asyncHandler(sos.acceptSOSRequest),
);
router.patch(
  "/availability",
  authenticate,
  authorize("PROVIDER"),
  asyncHandler(sos.updateAvailability),
);
router.get(
  "/rate-card",
  authenticate,
  authorize("PROVIDER"),
  asyncHandler(sos.getSOSRateCard),
);
router.patch(
  "/rate-card",
  authenticate,
  authorize("PROVIDER"),
  asyncHandler(sos.updateSOSRateCard),
);

export default router;
