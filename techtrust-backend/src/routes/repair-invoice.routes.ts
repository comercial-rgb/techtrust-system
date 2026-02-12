/**
 * ============================================
 * REPAIR INVOICE ROUTES
 * ============================================
 * FDACS-compliant Repair Invoice management
 */

import { Router } from "express";
import * as repairInvoiceController from "../controllers/repair-invoice.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(authenticate);

// List my invoices (customer or provider)
router.get("/my", asyncHandler(repairInvoiceController.getMyInvoices));

// Get invoice detail
router.get("/:id", asyncHandler(repairInvoiceController.getInvoice));

// Update work performed (provider)
router.patch(
  "/:id/update-work",
  asyncHandler(repairInvoiceController.updateWorkPerformed),
);

// Complete invoice (provider)
router.patch(
  "/:id/complete",
  asyncHandler(repairInvoiceController.completeInvoice),
);

// Customer accepts invoice
router.patch(
  "/:id/accept",
  asyncHandler(repairInvoiceController.acceptInvoice),
);

// Customer disputes invoice
router.patch(
  "/:id/dispute",
  asyncHandler(repairInvoiceController.disputeInvoice),
);

export default router;
