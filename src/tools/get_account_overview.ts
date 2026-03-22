import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountInfo } from '../api/account.js';
import { formatNumber, formatWinRate, formatAvg } from '../utils/format.js';
import { logger } from '../utils/logger.js';

export function registerAccountOverview(server: McpServer): void {
  server.tool(
    'wot_get_account_overview',
    'Full account overview: credits, gold, free XP, bonds + global stats.',
    {},
    async () => {
      try {
        const info = await getAccountInfo();
        const priv = info.private;
        const stats = info.statistics.all;

        const winRate = formatWinRate(stats.wins, stats.battles);
        const avgDamage = formatAvg(stats.damage_dealt, stats.battles);
        const avgXp = formatAvg(stats.xp, stats.battles);

        const lines: string[] = [
          `\ud83c\udf96\ufe0f ${info.nickname} \u2014 WoT Account`,
          `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
        ];

        if (priv) {
          lines.push(
            `\ud83d\udcb0 Credits      ${formatNumber(priv.credits)}`,
            `\ud83e\udd47 Gold         ${formatNumber(priv.gold)}`,
            `\u2b50 Free XP      ${formatNumber(priv.free_xp)}`,
            `\ud83d\udd17 Bonds        ${formatNumber(priv.bonds)}`,
          );
        } else {
          lines.push('(Private data unavailable \u2014 token expired?)');
        }

        lines.push(
          `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
          `\ud83d\udcca Global Statistics`,
          `Battles: ${formatNumber(stats.battles)}  |  Win Rate: ${winRate}`,
          `Avg Dmg: ${formatNumber(avgDamage)}  |  Avg XP: ${formatNumber(avgXp)}`,
          `Frags: ${formatNumber(stats.frags)}  |  Spotted: ${formatNumber(stats.spotted)}`,
        );

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_account_overview failed:', err);
        return { content: [{ type: 'text' as const, text: 'An error occurred while fetching account overview.' }], isError: true };
      }
    },
  );
}
