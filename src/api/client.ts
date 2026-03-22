import axios, { type AxiosInstance, type AxiosError } from 'axios';
import https from 'node:https';
import { logger } from '../utils/logger.js';

const REGION_HOSTS: Record<string, string> = {
  eu: 'api.worldoftanks.eu',
  na: 'api.worldoftanks.com',
  asia: 'api.worldoftanks.asia',
};

// Retryable HTTP status codes (server errors + rate limit)
const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

export interface WgApiResponse<T> {
  status: 'ok' | 'error';
  meta?: { count: number };
  data: T;
  error?: { code: number; message: string; field: string; value: string };
}

let clientInstance: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (clientInstance) return clientInstance;

  const region = process.env.WG_REGION ?? 'eu';
  const host = REGION_HOSTS[region] ?? REGION_HOSTS.eu;

  clientInstance = axios.create({
    baseURL: `https://${host}/wot/`,
    timeout: 10000,
    params: {
      application_id: process.env.WG_APPLICATION_ID,
    },
    // Limit concurrent connections
    httpsAgent: new https.Agent({ maxSockets: 10 }),
  });

  // Retry interceptor: 3 attempts with exponential backoff, only on retryable errors
  clientInstance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config;
    if (!config) throw error;

    // Only retry on retryable status codes or network errors
    const status = error.response?.status;
    const isRetryable = !status || RETRYABLE_CODES.has(status);
    if (!isRetryable) throw error;

    const configAny = config as unknown as Record<string, unknown>;
    const retryCount = (configAny.__retryCount as number) ?? 0;
    if (retryCount >= 3) throw error;

    configAny.__retryCount = retryCount + 1;
    const delay = Math.pow(2, retryCount) * 1000;
    logger.warn(`Request failed (${status ?? 'network'}), retrying in ${delay}ms (${retryCount + 1}/3)`);
    await new Promise(r => setTimeout(r, delay));
    return clientInstance!.request(config);
  });

  return clientInstance;
}

/** Make an API call and unwrap the Wargaming response. */
export async function wgGet<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const client = getClient();

  const accessToken = process.env.WG_ACCESS_TOKEN;
  if (accessToken) {
    params.access_token = accessToken;
  }

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  );

  const { data } = await client.get<WgApiResponse<T>>(endpoint, { params: cleanParams });

  if (data.status !== 'ok') {
    throw new Error('Wargaming API request failed');
  }

  return data.data;
}

/** Run tasks in parallel with a concurrency limit. */
export async function parallelLimit<T>(tasks: (() => Promise<T>)[], limit = 3): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then(r => { results.push(r); });
    executing.add(p);
    const cleanup = () => { executing.delete(p); };
    p.then(cleanup, cleanup);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
