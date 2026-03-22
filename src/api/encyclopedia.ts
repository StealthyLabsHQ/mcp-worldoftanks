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

const cache = new Map<number, VehicleInfo>();
let fullFetchDone = false;

/** Resolve tank IDs to vehicle info, batching max 100 per API call. */
export async function resolveVehicles(tankIds: number[]): Promise<Map<number, VehicleInfo>> {
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

/** Search vehicles by name (approximate match). Triggers full fetch on first call. */
export async function searchByName(query: string): Promise<VehicleInfo[]> {
  if (!fullFetchDone) {
    logger.info('Encyclopedia: fetching full vehicle list...');
    const data = await wgGet<Record<string, VehicleInfo | null>>('encyclopedia/vehicles/', {
      fields: 'tank_id,name,short_name,tier,nation,type',
    });

    for (const [id, vehicle] of Object.entries(data)) {
      if (vehicle) {
        cache.set(Number(id), vehicle);
      }
    }
    fullFetchDone = true;
    logger.info(`Encyclopedia: ${cache.size} vehicles cached`);
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
