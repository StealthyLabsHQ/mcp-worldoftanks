/**
 * WN8 rating engine.
 * Expected values source: XVM (https://static.modxvm.com/wn8-data-exp/json/wn8exp.json)
 * Cached to disk in ~/.wot-mcp/wn8exp.json with a 7-day TTL.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { logger } from '../utils/logger.js';

const WN8_EXP_URL = 'https://static.modxvm.com/wn8-data-exp/json/wn8exp.json';
const CACHE_DIR = path.join(os.homedir(), '.wot-mcp');
const WN8_CACHE_FILE = path.join(CACHE_DIR, 'wn8exp.json');
const WN8_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface Wn8Expected {
  IDNum: number;
  expDef: number;
  expFrag: number;
  expSpot: number;
  expDamage: number;
  expWinRate: number;
}

let wn8Map: Map<number, Wn8Expected> | null = null;

function fetchRaw(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export async function loadWn8ExpectedValues(): Promise<Map<number, Wn8Expected>> {
  if (wn8Map) return wn8Map;

  // Try disk cache first
  try {
    const stat = await fs.stat(WN8_CACHE_FILE);
    if (Date.now() - stat.mtimeMs < WN8_TTL_MS) {
      const raw = await fs.readFile(WN8_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as { data: Wn8Expected[] };
      wn8Map = new Map(parsed.data.map(e => [e.IDNum, e]));
      logger.info(`WN8: loaded ${wn8Map.size} expected values from disk cache`);
      return wn8Map;
    }
  } catch {
    // Cache miss or stale — fetch from network
  }

  logger.info('WN8: fetching expected values from network...');
  const raw = await fetchRaw(WN8_EXP_URL);
  const parsed = JSON.parse(raw) as { data: Wn8Expected[] };

  // Atomic write to disk
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const tmp = WN8_CACHE_FILE + '.tmp';
    await fs.writeFile(tmp, raw, 'utf8');
    await fs.rename(tmp, WN8_CACHE_FILE);
    logger.info(`WN8: saved ${parsed.data.length} expected values to disk`);
  } catch (e) {
    logger.warn('WN8: failed to persist cache to disk', e);
  }

  wn8Map = new Map(parsed.data.map(e => [e.IDNum, e]));
  return wn8Map;
}

/**
 * Calculate WN8 for a single tank.
 * Returns null if expected values are unavailable or battles = 0.
 */
export function calculateWn8(
  tankId: number,
  battles: number,
  wins: number,
  damage: number,
  frags: number,
  spotted: number,
  def: number,
  expMap: Map<number, Wn8Expected>,
): number | null {
  const exp = expMap.get(tankId);
  if (!exp || battles === 0) return null;
  if (!exp.expDamage || !exp.expWinRate) return null;

  const rDAMAGE = (damage / battles) / exp.expDamage;
  const rSPOT   = exp.expSpot  > 0 ? (spotted / battles) / exp.expSpot  : 0;
  const rFRAG   = exp.expFrag  > 0 ? (frags   / battles) / exp.expFrag  : 0;
  const rDEF    = exp.expDef   > 0 ? (def     / battles) / exp.expDef   : 0;
  const rWIN    = (wins / battles * 100) / exp.expWinRate;

  const rWINc    = Math.max(0, (rWIN    - 0.71) / (1 - 0.71));
  const rDAMAGEc = Math.max(0, (rDAMAGE - 0.22) / (1 - 0.22));
  const rFRAGc   = Math.max(0, Math.min(rDAMAGEc + 0.2, (rFRAG - 0.12) / (1 - 0.12)));
  const rSPOTc   = Math.max(0, Math.min(rDAMAGEc + 0.1, (rSPOT - 0.38) / (1 - 0.38)));
  const rDEFc    = Math.max(0, Math.min(rDAMAGEc + 0.1, (rDEF  - 0.10) / (1 - 0.10)));

  const wn8 = 980 * rDAMAGEc
    + 210 * rDAMAGEc * rFRAGc
    + 155 * rFRAGc   * rSPOTc
    +  75 * rDEFc    * rFRAGc
    + 145 * Math.min(1.8, rWINc);

  return Math.round(wn8);
}
