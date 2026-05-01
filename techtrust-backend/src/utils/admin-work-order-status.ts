import { SERVICE_FLOW } from "../config/businessRules";

/** Status de WO que o admin pode atribuir via PATCH (alinhado ao fluxo de serviço). */
export const ADMIN_PATCHABLE_WORK_ORDER_STATUSES: ReadonlySet<string> =
  new Set<string>(Object.values(SERVICE_FLOW.STATUSES));

export type AdminWorkOrderStatusValidationInput = {
  currentStatus: string;
  nextStatus: string;
  /** Existe pagamento (qualquer tipo) em AUTHORIZED — hold ainda não capturado */
  hasAuthorizedPaymentHold: boolean;
  /** Permite COMPLETED apesar de hold AUTHORIZED (auditoria / exceção) */
  forceComplete?: boolean;
  /** Reabrir WO após CANCELLED */
  forceReopen?: boolean;
  /** Motivo informado pelo admin (obrigatório com force*) */
  reason?: string;
};

export type AdminWorkOrderStatusValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function reasonOk(reason: string | undefined, minLen: number): boolean {
  return typeof reason === "string" && reason.trim().length >= minLen;
}

/**
 * Valida alteração manual de status por admin (evita saltos perigosos sem intenção explícita).
 */
export function validateAdminWorkOrderStatusPatch(
  input: AdminWorkOrderStatusValidationInput,
): AdminWorkOrderStatusValidationResult {
  const { currentStatus, nextStatus } = input;

  if (!nextStatus || typeof nextStatus !== "string") {
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: "Campo status é obrigatório.",
    };
  }

  if (!ADMIN_PATCHABLE_WORK_ORDER_STATUSES.has(nextStatus)) {
    return {
      ok: false,
      code: "STATUS_NOT_ALLOWED",
      message: `Status "${nextStatus}" não é permitido para correção manual.`,
    };
  }

  if (currentStatus === "CANCELLED" && nextStatus !== "CANCELLED") {
    if (!input.forceReopen || !reasonOk(input.reason, 10)) {
      return {
        ok: false,
        code: "REOPEN_REQUIRES_FORCE",
        message:
          "Reabrir ordem cancelada exige forceReopen: true e reason (mín. 10 caracteres).",
      };
    }
  }

  if (currentStatus === "COMPLETED" && nextStatus !== "COMPLETED") {
    if (!input.forceReopen || !reasonOk(input.reason, 10)) {
      return {
        ok: false,
        code: "UNCOMPLETE_REQUIRES_FORCE",
        message:
          "Alterar ordem já COMPLETED exige forceReopen: true e reason (mín. 10 caracteres).",
      };
    }
  }

  if (
    nextStatus === SERVICE_FLOW.STATUSES.COMPLETED &&
    input.hasAuthorizedPaymentHold &&
    !input.forceComplete
  ) {
    return {
      ok: false,
      code: "ACTIVE_HOLD_BLOCKS_COMPLETE",
      message:
        "Existe pré-autorização (hold) ativa nesta ordem. Capture ou cancele no fluxo de pagamento, ou use forceComplete: true com reason para exceção documentada.",
    };
  }

  if (
    input.forceComplete &&
    input.hasAuthorizedPaymentHold &&
    !reasonOk(input.reason, 10)
  ) {
    return {
      ok: false,
      code: "FORCE_COMPLETE_REASON_REQUIRED",
      message:
        "forceComplete com hold ativo exige reason com pelo menos 10 caracteres para auditoria.",
    };
  }

  return { ok: true };
}
