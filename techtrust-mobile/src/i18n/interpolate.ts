/**
 * Replace {{key}} placeholders in a template string (spacing around key allowed).
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      String(val),
    );
  }
  return out;
}
