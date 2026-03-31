/**
 * Formatting utilities: numbers, dates, win rate, durations.
 * Wargaming API timestamps are in Unix SECONDS (not ms).
 */

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(n: number): string {
  return numberFormatter.format(n);
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** Convert Unix timestamp (seconds) to readable date string. */
export function formatDate(unixSeconds: number): string {
  return dateFormatter.format(new Date(unixSeconds * 1000));
}

/** Win rate as percentage with 1 decimal. Returns "0.0%" if 0 battles. */
export function formatWinRate(wins: number, battles: number): string {
  if (battles === 0) return '0.0%';
  return (wins / battles * 100).toFixed(1) + '%';
}

/** Number of days remaining from a Unix timestamp (seconds). */
export function formatDaysRemaining(unixSeconds: number): number {
  const diff = unixSeconds - Date.now() / 1000;
  return Math.max(0, Math.ceil(diff / 86400));
}

/** Integer average with zero-division guard. */
export function formatAvg(total: number, count: number): number {
  if (count === 0) return 0;
  return Math.round(total / count);
}

/** Percentage with 1 decimal and zero-division guard. */
export function formatPercent(num: number, total: number): string {
  if (total === 0) return '0.0%';
  return (num / total * 100).toFixed(1) + '%';
}

/** WN8 value with colour label, or "N/A" if null. */
export function formatWn8Display(wn8: number | null): string {
  if (wn8 === null) return 'N/A';
  let label: string;
  if (wn8 < 300)       label = '⬛ Very Bad';
  else if (wn8 < 600)  label = '🟥 Bad';
  else if (wn8 < 900)  label = '🟧 Below Average';
  else if (wn8 < 1250) label = '🟨 Average';
  else if (wn8 < 1600) label = '🟩 Above Average';
  else if (wn8 < 1900) label = '🟦 Good';
  else if (wn8 < 2350) label = '🟪 Very Good';
  else if (wn8 < 2900) label = '💜 Great';
  else if (wn8 < 3500) label = '🔵 Unicum';
  else                  label = '💎 Super Unicum';
  return `${wn8} ${label}`;
}
