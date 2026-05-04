/**
 * Format "HH:mm" (24h) to 12-hour clock using localized AM/PM labels.
 */
export function formatTime12h(
  time: string,
  amLabel: string,
  pmLabel: string,
): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h) || mStr === undefined) return time;
  const label = h < 12 ? amLabel : pmLabel;
  const hour = h % 12 || 12;
  return `${hour}:${mStr} ${label}`;
}
