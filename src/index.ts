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
  version: '1.0.0',
});

// Register all tools
registerAccountOverview(server);
registerGarage(server);
registerTankStats(server);
registerAccountStatus(server);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

logger.info('WoT MCP Server started — 4 tools registered');
