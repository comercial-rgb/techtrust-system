/**
 * Backend often returns `{ success, data }`. Unwrap when present.
 */
export function unwrapApiData<T = unknown>(body: unknown): T {
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** When list payloads are either `T[]` or `{ data: T[] }`. */
export function unwrapArrayData<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body !== null && typeof body === "object" && "data" in body) {
    const inner = (body as { data: unknown }).data;
    return Array.isArray(inner) ? (inner as T[]) : [];
  }
  return [];
}
