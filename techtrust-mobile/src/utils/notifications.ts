/**
 * Normaliza GET /notifications para a lista da UI mobile.
 * Compatível com `data` como Json (objeto) ou string JSON legada.
 */

export type MobileNotificationUiType =
  | "request"
  | "quote"
  | "payment"
  | "message"
  | "review"
  | "system";

export interface MobileNotificationListItem {
  id: string;
  type: MobileNotificationUiType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export function parseNotificationPayload(
  data: unknown,
): Record<string, unknown> | undefined {
  if (data == null || data === "") return undefined;
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  if (typeof data === "string") {
    try {
      const v = JSON.parse(data);
      return typeof v === "object" && v !== null && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function mapBackendNotificationType(
  backendType: string | undefined,
): MobileNotificationUiType {
  const t = (backendType || "").toUpperCase();
  if (t.includes("CHAT")) return "message";
  if (
    t.includes("PAYMENT") ||
    t === "RECEIPT_GENERATED" ||
    t === "INSUFFICIENT_FUNDS"
  ) {
    return "payment";
  }
  if (
    t.includes("QUOTE") ||
    t === "NEW_QUOTE" ||
    t.includes("ESTIMATE") ||
    t.includes("COMPETING") ||
    t.includes("SUPPLEMENT")
  ) {
    return "quote";
  }
  if (t.includes("REQUEST") || t.includes("CANCELLATION")) return "request";
  if (t.includes("REVIEW")) return "review";
  return "system";
}

export function formatNotificationTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function mapApiNotificationsToMobileList(
  raw: unknown[] | null | undefined,
): MobileNotificationListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const n = row as Record<string, unknown>;
    return {
      id: String(n.id ?? ""),
      type: mapBackendNotificationType(
        typeof n.type === "string" ? n.type : undefined,
      ),
      title: typeof n.title === "string" ? n.title : "",
      message: typeof n.message === "string" ? n.message : "",
      time: formatNotificationTime(
        typeof n.createdAt === "string" ? n.createdAt : undefined,
      ),
      read: Boolean(n.isRead),
      data: parseNotificationPayload(n.data),
    };
  });
}
