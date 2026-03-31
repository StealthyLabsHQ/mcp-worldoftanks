import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountInfo } from '../api/account.js';
import { saveSnapshot } from '../api/snapshots.js';
import { formatNumber, formatWinRate, formatAvg, formatPercent } from '../utils/format.js';
import { logger } from '../utils/logger.js';

export function registerAccountOverview(server: McpServer): void {
  server.tool(
    'wot_get_account_overview',
    'Full account overview: credits, gold, free XP, bonds + global stats (win rate, hit ratio, survival rate, avg damage/XP/frags).',
    {},
    async () => {
      try {
        const info = await getAccountInfo();
        const priv = info.private;
        const stats = info.statistics.all;

        const winRate    = formatWinRate(stats.wins, stats.battles);
        const avgDamage  = formatAvg(stats.damage_dealt, stats.battles);
        const avgXp      = formatAvg(stats.xp, stats.battles);
        const avgFrags   = (stats.battles > 0 ? stats.frags / stats.battles : 0).toFixed(2);
        const hitRatio   = formatPercent(stats.hits, stats.shots);
        const survRate   = formatPercent(stats.survived_battles, stats.battles);
        const avgDef     = (stats.battles > 0 ? stats.dropped_capture_points / stats.battles : 0).toFixed(2);

        const lines: string[] = [
          `🎖️ ${info.nickname} — WoT Account`,
          `════════════════════════════`,
        ];

        if (priv) {
          lines.push(
            `💰 Credits      ${formatNumber(priv.credits)}`,
            `🥇 Gold         ${formatNumber(priv.gold)}`,
            `⭐ Free XP      ${formatNumber(priv.free_xp)}`,
            `🔗 Bonds        ${formatNumber(priv.bonds)}`,
          );
        } else {
          lines.push('(Private data unavailable — token expired?)');
        }

        lines.push(
          `────────────────────────────`,
          `📊 Global Statistics`,
          `Battles  : ${formatNumber(stats.battles)}  |  Win Rate  : ${winRate}`,
          `Avg Dmg  : ${formatNumber(avgDamage)}  |  Avg XP    : ${formatNumber(avgXp)}`,
          `Frags    : ${formatNumber(stats.frags)}  |  Avg Frags : ${avgFrags}`,
          `Spotted  : ${formatNumber(stats.spotted)}  |  Avg Def   : ${avgDef}`,
          `Hit Ratio: ${hitRatio}  |  Survival  : ${survRate}`,
        );

        // Fire-and-forget snapshot (atomic write, safe failure)
        const accountId = process.env.WG_ACCOUNT_ID;
        if (accountId) {
          saveSnapshot(accountId, {
            battles:       stats.battles,
            wins:          stats.wins,
            damage_dealt:  stats.damage_dealt,
            frags:         stats.frags,
            spotted:       stats.spotted,
            xp:            stats.xp,
          }).catch(e => logger.warn('Snapshot save failed:', e));
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_account_overview failed:', err);
        return {
          content: [{ type: 'text' as const, text: 'An error occurred while fetching account overview.' }],
          isError: true,
        };
      }
    },
  );
}
