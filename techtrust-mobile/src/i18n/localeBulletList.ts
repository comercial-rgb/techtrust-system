/**
 * Split a newline-separated locale string into trimmed bullet lines.
 */
export function localeBulletList(
  localized: string | undefined,
  fallbackMultiline: string,
): string[] {
  const src =
    localized && localized.trim().length > 0
      ? localized
      : fallbackMultiline;
  return src
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
