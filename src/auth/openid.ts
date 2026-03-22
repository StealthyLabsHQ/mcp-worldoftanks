import crypto from 'node:crypto';
import express from 'express';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { saveToken, loadToken, needsRenewal } from './token-store.js';
import type { WotToken } from './token-store.js';

const REGION_HOSTS: Record<string, string> = {
  eu: 'api.worldoftanks.eu',
  na: 'api.worldoftanks.com',
  asia: 'api.worldoftanks.asia',
};

function getHost(region: string): string {
  return REGION_HOSTS[region] ?? REGION_HOSTS.eu;
}

/** Renew an existing token via the prolongate endpoint. */
export async function renewToken(token: WotToken, appId: string): Promise<WotToken> {
  const host = getHost(token.region);
  const url = `https://${host}/wot/auth/prolongate/`;

  const params = new URLSearchParams({
    application_id: appId,
    access_token: token.access_token,
  });

  const { data } = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (data.status !== 'ok') {
    throw new Error('Token renewal failed');
  }

  const renewed: WotToken = {
    ...token,
    access_token: data.data.access_token,
    expires_at: data.data.expires_at,
  };

  await saveToken(renewed);
  logger.info(`Token renewed for ${renewed.nickname}`);
  return renewed;
}

/** Check and auto-renew token at MCP server startup. */
export async function ensureValidToken(): Promise<WotToken | null> {
  const token = await loadToken();
  if (!token) return null;

  const appId = process.env.WG_APPLICATION_ID;
  if (!appId) return token;

  if (needsRenewal(token)) {
    try {
      return await renewToken(token, appId);
    } catch {
      logger.warn('Auto-renewal failed, token may still be valid');
      return token;
    }
  }

  return token;
}

// ── Standalone auth flow (npm run auth) ─────────────────────────────

async function runAuthFlow(): Promise<void> {
  dotenv.config();

  const appId = process.env.WG_APPLICATION_ID;
  const region = process.env.WG_REGION ?? 'eu';

  if (!appId) {
    logger.error('WG_APPLICATION_ID is not set in .env');
    process.exit(1);
  }

  const host = getHost(region);
  const redirectUri = 'http://localhost:3001/callback';

  const app = express();

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    next();
  });

  const server = app.listen(3001, '127.0.0.1', () => {
    logger.info('Auth server running on http://127.0.0.1:3001');
    logger.info(`\n\u2192 Open this link:\n${loginUrl}\n`);
  });

  // Generate CSRF state token
  const csrfState = crypto.randomBytes(16).toString('hex');
  const loginUrl = `https://${host}/wot/auth/login/?application_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error('Port 3001 already in use. Close the other process and retry.');
    } else {
      logger.error('Auth server error');
    }
    process.exit(1);
  });

  // Auto-shutdown after 5 minutes
  const timeout = setTimeout(() => {
    logger.error('Auth timeout — no callback received within 5 minutes');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);

  app.get('/callback', async (req, res) => {
    const { status, access_token, account_id, nickname, expires_at } = req.query;

    if (status !== 'ok' || !access_token || !account_id) {
      res.status(400).send('Authentication failed. Check the terminal.');
      logger.error('Auth callback failed');
      clearTimeout(timeout);
      server.close();
      process.exit(1);
      return;
    }

    // Validate callback params
    const accountStr = String(account_id);
    if (!/^\d+$/.test(accountStr)) {
      res.status(400).send('Invalid account ID.');
      clearTimeout(timeout);
      server.close();
      process.exit(1);
      return;
    }

    const token: WotToken = {
      access_token: String(access_token),
      account_id: accountStr,
      expires_at: Number(expires_at),
      nickname: String(nickname ?? 'Unknown'),
      region,
    };

    await saveToken(token);

    const expiresDate = new Date(token.expires_at * 1000).toLocaleDateString('en-US');
    res.send('<h1>Authentication successful!</h1><p>Token saved. You can close this page.</p>');
    logger.info(`Token saved for ${token.nickname} — valid until ${expiresDate}`);

    clearTimeout(timeout);
    server.close(() => {
      process.exit(0);
    });
  });
}

// Detect if this file is being run directly (npm run auth)
const currentFile = fileURLToPath(import.meta.url);
const argv1 = process.argv[1] ?? '';
const isMain =
  currentFile === argv1 ||
  currentFile.replace(/\.ts$/, '.js') === argv1 ||
  argv1.endsWith('auth/openid.ts') ||
  argv1.endsWith('auth\\openid.ts');

if (isMain) {
  runAuthFlow();
}
