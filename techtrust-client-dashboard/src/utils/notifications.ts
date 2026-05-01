/**
 * Normaliza linhas de GET /notifications para o formato usado no dashboard.
 * Compatível com `data` como Json (objeto) ou string JSON legada.
 */

export interface NormalizedClientNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  data?: unknown;
}

export function parseNotificationPayload(data: unknown): unknown {
  if (data == null || data === "") return undefined;
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

export function normalizeNotificationRow(
  n: Record<string, unknown>,
): NormalizedClientNotification {
  return {
    id: String(n.id ?? ""),
    title: typeof n.title === "string" ? n.title : "",
    message: typeof n.message === "string" ? n.message : "",
    read: Boolean(n.isRead),
    createdAt:
      typeof n.createdAt === "string"
        ? n.createdAt
        : new Date().toISOString(),
    type: typeof n.type === "string" ? n.type : undefined,
    data: parseNotificationPayload(n.data),
  };
}

export function normalizeNotificationList(
  list: unknown[] | null | undefined,
): NormalizedClientNotification[] {
  if (!Array.isArray(list)) return [];
  return list.map((n) => normalizeNotificationRow(n as Record<string, unknown>));
}
