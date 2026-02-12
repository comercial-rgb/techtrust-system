/**
 * Multi-State Compliance Routes
 * State profiles, jurisdiction policies, compliance requirements catalog,
 * rule engine endpoints, and disclaimer management.
 */

import { Router } from "express";
import * as controller from "../controllers/state-profile.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

// ── Public: active states list ──
router.get("/states/active", asyncHandler(controller.getActiveStates));

// ── All routes below require authentication ──
router.use(authenticate);

// ── State Profiles (admin) ──
router.get("/state-profiles", asyncHandler(controller.listStateProfiles));
router.get("/state-profiles/:stateCode", asyncHandler(controller.getStateProfile));
router.post("/state-profiles", asyncHandler(controller.upsertStateProfile));

// ── Compliance Requirements Catalog (admin) ──
router.get("/compliance-requirements", asyncHandler(controller.listComplianceRequirements));
router.post("/compliance-requirements", asyncHandler(controller.upsertComplianceRequirement));

// ── Jurisdiction Policies (admin) ──
router.get("/jurisdiction-policies/:stateCode", asyncHandler(controller.listJurisdictionPolicies));
router.post("/jurisdiction-policies", asyncHandler(controller.upsertJurisdictionPolicy));

// ── Rule Engine ──
router.post("/rule-engine/resolve/:providerProfileId", asyncHandler(controller.resolveProviderRequirements));
router.post("/rule-engine/eligibility/:providerProfileId", asyncHandler(controller.recalculateEligibility));

// ── States (admin: all, including inactive) ──
router.get("/states/all", asyncHandler(controller.getAllStates));

// ── Disclaimers ──
router.get("/disclaimers", asyncHandler(controller.listDisclaimers));
router.post("/disclaimers", asyncHandler(controller.createDisclaimer));

export default router;
