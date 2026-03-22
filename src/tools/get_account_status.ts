import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountInfo } from '../api/account.js';
import { formatDate, formatDaysRemaining } from '../utils/format.js';
import { logger } from '../utils/logger.js';

export function registerAccountStatus(server: McpServer): void {
  server.tool(
    'wot_get_account_status',
    'Account status: Premium (active/expired/days remaining) and ban info.',
    {},
    async () => {
      try {
        const info = await getAccountInfo();
        const priv = info.private;

        const lines = [
          `\ud83d\udee1\ufe0f Account Status \u2014 ${info.nickname}`,
          `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
        ];

        if (!priv) {
          lines.push('(Private data unavailable \u2014 token expired?)');
          return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
        }

        // Premium status
        // Note: premium_expires_at=0 + is_premium=false can mean Wargaming Premium
        // (unified, multi-game) which is NOT exposed by the WoT API.
        if (priv.premium_expires_at > 0 && priv.premium_expires_at > Date.now() / 1000) {
          const days = formatDaysRemaining(priv.premium_expires_at);
          lines.push(`\u2b50 Premium   \u2705 Active \u2014 expires ${formatDate(priv.premium_expires_at)} (${days} days)`);
        } else if (priv.premium_expires_at > 0) {
          lines.push(`\u2b50 Premium   \u274c Expired since ${formatDate(priv.premium_expires_at)}`);
        } else if (priv.is_premium) {
          lines.push(`\u2b50 Premium   \u2705 Active (Wargaming Premium)`);
        } else {
          lines.push(`\u2b50 Premium   \u2753 Not detected via API (unified Wargaming Premium is not exposed \u2014 check the WoT portal)`);
        }

        // Ban status
        if (priv.ban_info) {
          lines.push(`\ud83d\udeab Ban       \u274c ${priv.ban_info}`);
          if (priv.ban_time) {
            lines.push(`  Expires ${formatDate(priv.ban_time)}`);
          }
        } else {
          lines.push(`\ud83d\udeab Ban       \u2705 No active ban`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_account_status failed:', err);
        return { content: [{ type: 'text' as const, text: 'An error occurred while fetching account status.' }], isError: true };
      }
    },
  );
}
