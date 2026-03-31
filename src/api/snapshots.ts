/**
 * Local stats snapshots — one file per day per account.
 * Stored in ~/.wot-mcp/snapshots/{accountId}_{YYYY-MM-DD}.json
 * Enables "recent stats" comparisons between calls.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../utils/logger.js';

const SNAPSHOTS_DIR = path.join(os.homedir(), '.wot-mcp', 'snapshots');

export interface StatsSnapshot {
  timestamp: number;
  date: string; // YYYY-MM-DD
  battles: number;
  wins: number;
  damage_dealt: number;
  frags: number;
  spotted: number;
  xp: number;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Validate accountId is purely numeric to prevent path traversal. */
function safeAccountId(accountId: string): string {
  if (!/^\d+$/.test(accountId)) throw new Error('Invalid account ID');
  return accountId;
}

/** Save (or overwrite) today's snapshot. Fire-and-forget safe via .catch(). */
export async function saveSnapshot(accountId: string, stats: Omit<StatsSnapshot, 'timestamp' | 'date'>): Promise<void> {
  const safe = safeAccountId(accountId);
  const date = todayDate();
  const snapshot: StatsSnapshot = { ...stats, timestamp: Date.now(), date };
  const file = path.join(SNAPSHOTS_DIR, `${safe}_${date}.json`);

  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
  await fs.rename(tmp, file);
  logger.debug(`Snapshot saved: ${file}`);
}

/**
 * Load the most recent snapshot that is NOT from today.
 * Returns null if none found.
 */
export async function loadPreviousSnapshot(accountId: string): Promise<StatsSnapshot | null> {
  const safe = safeAccountId(accountId);
  const today = todayDate();

  try {
    const files = await fs.readdir(SNAPSHOTS_DIR);
    const prefix = `${safe}_`;
    const candidates = files
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .map(f => f.slice(prefix.length, -5)) // extract YYYY-MM-DD
      .filter(d => d < today)               // exclude today
      .sort()
      .reverse();

    if (candidates.length === 0) return null;

    const file = path.join(SNAPSHOTS_DIR, `${prefix}${candidates[0]}.json`);
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as StatsSnapshot;
  } catch {
    return null;
  }
}
