import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountTanks } from '../api/tanks.js';
import { resolveVehicles } from '../api/encyclopedia.js';
import { getMasteryLabel } from '../utils/mastery.js';
import { formatNumber } from '../utils/format.js';
import { logger } from '../utils/logger.js';

const TIER_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const NATION_FLAGS: Record<string, string> = {
  germany: '\ud83c\udde9\ud83c\uddea', ussr: '\ud83c\uddf7\ud83c\uddfa', usa: '\ud83c\uddfa\ud83c\uddf8',
  france: '\ud83c\uddeb\ud83c\uddf7', uk: '\ud83c\uddec\ud83c\udde7', china: '\ud83c\udde8\ud83c\uddf3',
  japan: '\ud83c\uddef\ud83c\uddf5', czech: '\ud83c\udde8\ud83c\uddff', sweden: '\ud83c\uddf8\ud83c\uddea',
  poland: '\ud83c\uddf5\ud83c\uddf1', italy: '\ud83c\uddee\ud83c\uddf9',
};

const TANK_TYPES: Record<string, string> = {
  heavyTank: 'Heavy', mediumTank: 'Medium', lightTank: 'Light',
  'AT-SPG': 'TD', SPG: 'SPG',
};

export function registerGarage(server: McpServer): void {
  server.tool(
    'wot_get_garage',
    'List vehicles with name, nation, tier, type, mastery and battles.',
    {
      min_tier: z.number().min(1).max(10).optional().describe('Minimum tier (1-10)'),
      sort_by: z.enum(['tier', 'battles', 'mastery']).optional().describe('Sort criteria'),
    },
    async ({ min_tier, sort_by }) => {
      try {
        const tanks = await getAccountTanks();
        const tankIds = tanks.map(t => t.tank_id);
        const vehicles = await resolveVehicles(tankIds);

        let list = tanks.map(t => {
          const v = vehicles.get(t.tank_id);
          return {
            tank_id: t.tank_id,
            name: v?.name ?? `#${t.tank_id}`,
            nation: v?.nation ?? '??',
            tier: v?.tier ?? 0,
            type: v?.type ?? '??',
            mastery: t.mark_of_mastery,
            battles: t.statistics.battles,
          };
        });

        if (min_tier !== undefined) {
          list = list.filter(t => t.tier >= min_tier);
        }

        const sortKey = sort_by ?? 'tier';
        list.sort((a, b) => {
          if (sortKey === 'tier') return b.tier - a.tier || b.battles - a.battles;
          if (sortKey === 'battles') return b.battles - a.battles;
          return b.mastery - a.mastery || b.tier - a.tier;
        });

        const tierLabel = min_tier ? ` Tier ${TIER_ROMAN[min_tier]}+` : '';
        const lines = [
          `\ud83d\ude97 My Garage \u2014${tierLabel} (${list.length} vehicles)`,
          `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
        ];

        for (const t of list) {
          const flag = NATION_FLAGS[t.nation] ?? '\ud83c\udff3\ufe0f';
          const tier = (TIER_ROMAN[t.tier] ?? '?').padEnd(3);
          const type = (TANK_TYPES[t.type] ?? t.type).padEnd(8);
          const name = t.name.padEnd(16);
          const mastery = getMasteryLabel(t.mastery).padEnd(6);
          lines.push(`${flag} ${tier} ${type} ${name} ${mastery}| ${formatNumber(t.battles)} bat.`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_garage failed:', err);
        return { content: [{ type: 'text' as const, text: 'An error occurred while fetching garage.' }], isError: true };
      }
    },
  );
}
