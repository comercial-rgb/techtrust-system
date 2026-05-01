import { SERVICE_FLOW } from "../config/businessRules";
import {
  validateAdminWorkOrderStatusPatch,
  ADMIN_PATCHABLE_WORK_ORDER_STATUSES,
} from "./admin-work-order-status";

describe("validateAdminWorkOrderStatusPatch", () => {
  it("rejects unknown target status", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      nextStatus: "FAKE_STATUS",
      hasAuthorizedPaymentHold: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STATUS_NOT_ALLOWED");
  });

  it("blocks COMPLETED when there is an authorized hold unless forceComplete", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      nextStatus: SERVICE_FLOW.STATUSES.COMPLETED,
      hasAuthorizedPaymentHold: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ACTIVE_HOLD_BLOCKS_COMPLETE");
  });

  it("allows COMPLETED with forceComplete and reason", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      nextStatus: SERVICE_FLOW.STATUSES.COMPLETED,
      hasAuthorizedPaymentHold: true,
      forceComplete: true,
      reason: "Exceção aprovada pela operações — caso #12345",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects forceComplete with hold but short audit reason", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      nextStatus: SERVICE_FLOW.STATUSES.COMPLETED,
      hasAuthorizedPaymentHold: true,
      forceComplete: true,
      reason: "curto",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORCE_COMPLETE_REASON_REQUIRED");
  });

  it("requires forceReopen to leave CANCELLED", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.CANCELLED,
      nextStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      hasAuthorizedPaymentHold: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("REOPEN_REQUIRES_FORCE");
  });

  it("allows reopen from CANCELLED with forceReopen and reason", () => {
    const r = validateAdminWorkOrderStatusPatch({
      currentStatus: SERVICE_FLOW.STATUSES.CANCELLED,
      nextStatus: SERVICE_FLOW.STATUSES.IN_PROGRESS,
      hasAuthorizedPaymentHold: false,
      forceReopen: true,
      reason: "Correção administrativa solicitada pelo suporte nível 2",
    });
    expect(r.ok).toBe(true);
  });

  it("patchable set includes core flow statuses", () => {
    expect(ADMIN_PATCHABLE_WORK_ORDER_STATUSES.has("PAYMENT_HOLD")).toBe(
      true,
    );
    expect(ADMIN_PATCHABLE_WORK_ORDER_STATUSES.has("DISPUTED")).toBe(true);
  });
});
