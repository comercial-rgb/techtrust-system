export type ClientPlanTier = "FREE" | "STARTER" | "PRO";

export function normalizeClientPlan(raw: unknown): ClientPlanTier {
  const s = String(raw ?? "")
    .toUpperCase()
    .replace(/-/g, "_");
  if (s === "STARTER") return "STARTER";
  if (s === "PRO") return "PRO";
  return "FREE";
}

/** First non-empty candidate wins; otherwise FREE */
export function pickClientPlan(...candidates: unknown[]): ClientPlanTier {
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const t = normalizeClientPlan(c);
    if (t !== "FREE") return t;
  }
  return "FREE";
}
