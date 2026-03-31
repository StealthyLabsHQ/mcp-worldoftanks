import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { wgGet, parallelLimit } from './client.js';
import { logger } from '../utils/logger.js';

export interface VehicleInfo {
  tank_id: number;
  name: string;
  short_name: string;
  tier: number;
  nation: string;
  type: string;
}

const CACHE_DIR = path.join(os.homedir(), '.wot-mcp');
const ENC_CACHE_FILE = path.join(CACHE_DIR, 'encyclopedia.json');
const ENC_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cache = new Map<number, VehicleInfo>();
let fullFetchDone = false;
let diskCacheChecked = false;

/** Load from disk cache if fresh. Called once before any full fetch. */
async function tryLoadDiskCache(): Promise<void> {
  if (diskCacheChecked) return;
  diskCacheChecked = true;

  try {
    const stat = await fs.stat(ENC_CACHE_FILE);
    if (Date.now() - stat.mtimeMs < ENC_TTL_MS) {
      const raw = await fs.readFile(ENC_CACHE_FILE, 'utf8');
      const vehicles = JSON.parse(raw) as VehicleInfo[];
      for (const v of vehicles) cache.set(v.tank_id, v);
      fullFetchDone = true;
      logger.info(`Encyclopedia: loaded ${cache.size} vehicles from disk cache`);
    }
  } catch {
    // No cache or expired — will fetch from API on demand
  }
}

/** Persist full cache atomically. */
async function saveDiskCache(): Promise<void> {
  const vehicles = Array.from(cache.values());
  const tmp = ENC_CACHE_FILE + '.tmp';
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(vehicles), 'utf8');
    await fs.rename(tmp, ENC_CACHE_FILE);
    logger.debug(`Encyclopedia: persisted ${vehicles.length} vehicles to disk`);
  } catch (e) {
    logger.warn('Encyclopedia: failed to save disk cache', e);
    fs.unlink(tmp).catch(() => {});
  }
}

/** Resolve tank IDs to vehicle info, batching max 100 per API call. */
export async function resolveVehicles(tankIds: number[]): Promise<Map<number, VehicleInfo>> {
  await tryLoadDiskCache();

  const result = new Map<number, VehicleInfo>();
  const missing: number[] = [];

  for (const id of tankIds) {
    const cached = cache.get(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return result;

  // Split into chunks of 100
  const chunks: number[][] = [];
  for (let i = 0; i < missing.length; i += 100) {
    chunks.push(missing.slice(i, i + 100));
  }

  const tasks = chunks.map(chunk => async () => {
    const data = await wgGet<Record<string, VehicleInfo | null>>('encyclopedia/vehicles/', {
      tank_id: chunk.join(','),
      fields: 'tank_id,name,short_name,tier,nation,type',
    });

    for (const [id, vehicle] of Object.entries(data)) {
      if (vehicle) {
        cache.set(Number(id), vehicle);
        result.set(Number(id), vehicle);
      }
    }
  });

  await parallelLimit(tasks, 5);
  logger.debug(`Encyclopedia: resolved ${result.size}/${tankIds.length} vehicles (${cache.size} cached)`);

  return result;
}

/** Search vehicles by name (approximate match). Triggers full fetch + disk cache on first call. */
export async function searchByName(query: string): Promise<VehicleInfo[]> {
  await tryLoadDiskCache();

  if (!fullFetchDone) {
    logger.info('Encyclopedia: fetching full vehicle list...');
    const data = await wgGet<Record<string, VehicleInfo | null>>('encyclopedia/vehicles/', {
      fields: 'tank_id,name,short_name,tier,nation,type',
    });

    for (const [id, vehicle] of Object.entries(data)) {
      if (vehicle) cache.set(Number(id), vehicle);
    }
    fullFetchDone = true;
    logger.info(`Encyclopedia: ${cache.size} vehicles cached`);

    // Persist to disk (atomic, best-effort)
    saveDiskCache().catch(e => logger.warn('Encyclopedia: disk cache write failed', e));
  }

  const q = query.toLowerCase();
  const results: VehicleInfo[] = [];

  for (const vehicle of cache.values()) {
    if (
      vehicle.name.toLowerCase().includes(q) ||
      vehicle.short_name.toLowerCase().includes(q)
    ) {
      results.push(vehicle);
    }
  }

  return results;
}

export function resolveOne(tankId: number): VehicleInfo | undefined {
  return cache.get(tankId);
}
