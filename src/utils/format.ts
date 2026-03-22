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
