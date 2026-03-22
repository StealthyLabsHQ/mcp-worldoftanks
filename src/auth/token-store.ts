import { readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const TokenSchema = z.object({
  access_token: z.string().min(1),
  account_id: z.string().regex(/^\d+$/, 'account_id must be numeric'),
  expires_at: z.number().positive(),
  nickname: z.string().min(1),
  region: z.string().min(1),
});

export type WotToken = z.infer<typeof TokenSchema>;

/** Resolve token.json path relative to the project root. */
function getProjectRoot(): string {
  const dirName = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirName, '..', '..');
}

function getTokenPath(): string {
  return path.join(getProjectRoot(), 'token.json');
}

export async function loadToken(): Promise<WotToken | null> {
  const tokenPath = getTokenPath();
  try {
    const raw = await readFile(tokenPath, 'utf-8');
    const parsed = TokenSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      logger.warn('Invalid token.json format');
      return null;
    }
    logger.debug(`Token loaded from ${tokenPath}`);
    return parsed.data;
  } catch {
    return null;
  }
}

export async function saveToken(token: WotToken): Promise<void> {
  const tokenPath = getTokenPath();
  await writeFile(tokenPath, JSON.stringify(token, null, 2), 'utf-8');
  try {
    await chmod(tokenPath, 0o600);
  } catch {
    // chmod may fail on Windows
  }
  logger.info('Token saved');
}

export function isTokenValid(token: WotToken): boolean {
  return token.expires_at > Date.now() / 1000;
}

/** Token needs renewal if it expires within 2 hours. */
export function needsRenewal(token: WotToken): boolean {
  return token.expires_at < Date.now() / 1000 + 2 * 3600;
}
