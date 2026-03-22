import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTankStats } from '../api/tanks.js';
import { searchByName, resolveVehicles } from '../api/encyclopedia.js';
import { formatNumber, formatWinRate, formatAvg } from '../utils/format.js';
import { getMasteryLabel } from '../utils/mastery.js';
import { logger } from '../utils/logger.js';

export function registerTankStats(server: McpServer): void {
  server.tool(
    'wot_get_tank_stats',
    'Detailed stats for a tank by name or tank_id.',
    {
      tank_name: z.string().max(100).optional().describe('Tank name (approximate search)'),
      tank_id: z.number().int().min(1).max(999999).optional().describe('Tank ID'),
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
        const vehicles = await resolveVehicles([s.tank_id]);
        const v = vehicles.get(s.tank_id);

        const winRate = formatWinRate(s.all.wins, s.all.battles);
        const avgDamage = formatAvg(s.all.damage_dealt, s.all.battles);
        const avgXp = formatAvg(s.all.xp, s.all.battles);

        const lines = [
          `\ud83d\udcca ${v?.name ?? `Tank #${s.tank_id}`}`,
          v ? `Tier ${v.tier} | ${v.nation} | ${v.type}` : '',
          `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
          `Battles : ${formatNumber(s.all.battles)}`,
          `Win Rate: ${winRate}`,
          `Avg Dmg : ${formatNumber(avgDamage)}`,
          `Frags   : ${formatNumber(s.all.frags)}`,
          `Spotted : ${formatNumber(s.all.spotted)}`,
          `Avg XP  : ${formatNumber(avgXp)}`,
          `Max XP  : ${formatNumber(s.all.max_xp)}`,
          `Mastery : ${getMasteryLabel(s.mark_of_mastery)}`,
        ].filter(Boolean);

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_tank_stats failed:', err);
        return { content: [{ type: 'text' as const, text: 'An error occurred while fetching tank stats.' }], isError: true };
      }
    },
  );
}
