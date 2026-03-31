import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTankStats } from '../api/tanks.js';
import { searchByName, resolveVehicles } from '../api/encyclopedia.js';
import { loadWn8ExpectedValues, calculateWn8 } from '../api/wn8.js';
import { formatNumber, formatWinRate, formatAvg, formatPercent, formatWn8Display } from '../utils/format.js';
import { getMasteryLabel } from '../utils/mastery.js';
import { logger } from '../utils/logger.js';

export function registerTankStats(server: McpServer): void {
  server.tool(
    'wot_get_tank_stats',
    'Detailed stats for a tank by name or tank_id, including WN8 rating, hit ratio, and survival rate.',
    {
      tank_name: z.string().max(100).optional().describe('Tank name (approximate search)'),
      tank_id:   z.number().int().min(1).max(999999).optional().describe('Tank ID'),
    },
    async ({ tank_name, tank_id }) => {
      try {
        if (!tank_name && tank_id === undefined) {
          return { content: [{ type: 'text' as const, text: 'Error: provide tank_name or tank_id.' }], isError: true };
        }

        let resolvedTankId = tank_id;

        if (tank_name && resolvedTankId === undefined) {
          const matches = await searchByName(tank_name);
          if (matches.length === 0) {
            return { content: [{ type: 'text' as const, text: `No tank found for "${tank_name}".` }], isError: true };
          }
          if (matches.length > 1) {
            const list = matches.slice(0, 10).map(m => `  - ${m.name} (Tier ${m.tier}, ${m.nation})`).join('\n');
            return { content: [{ type: 'text' as const, text: `Multiple tanks match "${tank_name}":\n${list}\n\nPlease be more specific or use tank_id.` }] };
          }
          resolvedTankId = matches[0].tank_id;
        }

        const stats = await getTankStats(resolvedTankId);
        if (stats.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No stats found for this tank (never played?).' }], isError: true };
        }

        const s = stats[0];
        const [vehicles, expMap] = await Promise.all([
          resolveVehicles([s.tank_id]),
          loadWn8ExpectedValues().catch(() => new Map()),
        ]);
        const v = vehicles.get(s.tank_id);

        const winRate   = formatWinRate(s.all.wins, s.all.battles);
        const avgDamage = formatAvg(s.all.damage_dealt, s.all.battles);
        const avgXp     = formatAvg(s.all.xp, s.all.battles);
        const hitRatio  = formatPercent(s.all.hits, s.all.shots);
        const survRate  = formatPercent(s.all.survived_battles, s.all.battles);
        const wn8       = calculateWn8(
          s.tank_id, s.all.battles, s.all.wins,
          s.all.damage_dealt, s.all.frags, s.all.spotted,
          s.all.dropped_capture_points, expMap,
        );

        const lines = [
          `📊 ${v?.name ?? `Tank #${s.tank_id}`}`,
          v ? `Tier ${v.tier} | ${v.nation} | ${v.type}` : '',
          `════════════════════════════`,
          `Battles   : ${formatNumber(s.all.battles)}`,
          `Win Rate  : ${winRate}`,
          `WN8       : ${formatWn8Display(wn8)}`,
          `Avg Dmg   : ${formatNumber(avgDamage)}`,
          `Frags     : ${formatNumber(s.all.frags)}`,
          `Spotted   : ${formatNumber(s.all.spotted)}`,
          `Avg XP    : ${formatNumber(avgXp)}`,
          `Max XP    : ${formatNumber(s.all.max_xp)}`,
          `Hit Ratio : ${hitRatio}`,
          `Survival  : ${survRate}`,
          `Mastery   : ${getMasteryLabel(s.mark_of_mastery)}`,
        ].filter(Boolean);

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_tank_stats failed:', err);
        return {
          content: [{ type: 'text' as const, text: 'An error occurred while fetching tank stats.' }],
          isError: true,
        };
      }
    },
  );
}
