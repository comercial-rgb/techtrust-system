/** Browser logs: API error detail only in development. */

export function logApiError(message: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(message, error);
  }
}

export function logDev(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
}
