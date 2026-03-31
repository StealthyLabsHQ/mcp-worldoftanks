import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { ensureValidToken } from './auth/openid.js';
import { registerAccountOverview } from './tools/get_account_overview.js';
import { registerGarage } from './tools/get_garage.js';
import { registerTankStats } from './tools/get_tank_stats.js';
import { registerAccountStatus } from './tools/get_account_status.js';
import { registerAchievements } from './tools/get_achievements.js';
import { registerClanProfile } from './tools/get_clan_profile.js';
import { registerMasteryOverview } from './tools/get_mastery_overview.js';

// Load .env
dotenv.config();

// Validate required environment variables
const EnvSchema = z.object({
  WG_APPLICATION_ID: z.string().min(1, 'WG_APPLICATION_ID is required'),
  WG_REGION: z.enum(['eu', 'na', 'asia']).default('eu'),
});

const envResult = EnvSchema.safeParse(process.env);
if (!envResult.success) {
  logger.error('Invalid environment configuration:', envResult.error.flatten().fieldErrors);
  process.exit(1);
}

// Auto-renew token at startup if needed
const token = await ensureValidToken();
if (token) {
  if (!process.env.WG_ACCESS_TOKEN) process.env.WG_ACCESS_TOKEN = token.access_token;
  if (!process.env.WG_ACCOUNT_ID) process.env.WG_ACCOUNT_ID = token.account_id;
  if (!process.env.WG_REGION) process.env.WG_REGION = token.region;
  logger.info(`Token loaded for ${token.nickname} (${token.region})`);
} else {
  logger.warn('No token found — run "npm run auth" to authenticate');
}

// Create MCP server
const server = new McpServer({
  name: 'wot-mcp-server',
  version: '2.0.0',
});

// ─── Tools (7) ───────────────────────────────────────────────────────────────
registerAccountOverview(server);
registerGarage(server);
registerTankStats(server);
registerAccountStatus(server);
registerAchievements(server);
registerClanProfile(server);
registerMasteryOverview(server);

// ─── MCP Prompts ─────────────────────────────────────────────────────────────

server.prompt(
  'garage-audit',
  'Analyze my WoT garage and recommend what to sell, what to keep, and what to grind next.',
  {},
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: [
          'Please audit my World of Tanks garage using the available tools.',
          '',
          '1. Call wot_get_garage (no filter) to list all my vehicles.',
          '2. Identify tanks I should SELL: low-tier (≤ IV) with 0 battles, or duplicates.',
          '3. Identify tanks worth GRINDING: tier VII–X with few battles but high tier potential.',
          '4. Identify my TOP 5 most-played tanks (by battle count).',
          '5. Give a short personalised recommendation for each category.',
          '',
          'Be specific — include tank names, tiers, and battle counts in your answer.',
        ].join('\n'),
      },
    }],
  }),
);

server.prompt(
  'session-analysis',
  'Compare my current stats with the previous snapshot to analyse recent performance.',
  {},
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: [
          'Analyse my recent World of Tanks performance.',
          '',
          '1. Call wot_get_account_overview to fetch my current global stats (this also saves today\'s snapshot).',
          '2. The previous snapshot is stored locally in ~/.wot-mcp/snapshots/. If you have access to it, compare battles, win rate, and avg damage between today and the previous session.',
          '3. Identify trends: am I improving, declining, or stable?',
          '4. Based on my mastery overview (wot_get_mastery_overview), which tank should I focus on next to earn an Ace Tanker badge?',
          '',
          'Provide a concise performance summary and one actionable tip.',
        ].join('\n'),
      },
    }],
  }),
);

server.prompt(
  'tank-coach',
  'Deep analysis of a specific tank with improvement advice.',
  {
    tank_name: z.string().describe('Name of the tank to analyse'),
  },
  async ({ tank_name }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: [
          `I want a deep coaching analysis for my ${tank_name}.`,
          '',
          `1. Call wot_get_tank_stats with tank_name="${tank_name}" to get my full stats including WN8.`,
          `2. Call wot_get_achievements with tank_name="${tank_name}" to see my medals on this tank.`,
          '3. Based on the stats, identify my weaknesses (e.g. low hit ratio → aim more, low survival → positioning).',
          '4. Give 3 concrete, actionable tips to improve on this tank.',
          '5. Compare my WN8 to the scale (Very Bad / Bad / Average / Good / Unicum) and tell me what target I should aim for.',
          '',
          'Be specific and encouraging.',
        ].join('\n'),
      },
    }],
  }),
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

logger.info('WoT MCP Server v2.0.0 started — 7 tools + 3 prompts registered');
