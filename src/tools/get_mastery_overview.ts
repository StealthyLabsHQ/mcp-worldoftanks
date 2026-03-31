import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountTanks } from '../api/tanks.js';
import { resolveVehicles } from '../api/encyclopedia.js';
import { getMasteryLabel } from '../utils/mastery.js';
import { formatNumber } from '../utils/format.js';
import { logger } from '../utils/logger.js';

const TIER_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

export function registerMasteryOverview(server: McpServer): void {
  server.tool(
    'wot_get_mastery_overview',
    'Mastery badge distribution across the garage: count per level, list of Ace Tankers, and 1st Class tanks (next candidates for Ace).',
    {},
    async () => {
      try {
        const tanks = await getAccountTanks();
        const tankIds = tanks.map(t => t.tank_id);
        const vehicles = await resolveVehicles(tankIds);

        // Enrich with vehicle info
        const enriched = tanks.map(t => ({
          tank_id:  t.tank_id,
          name:     vehicles.get(t.tank_id)?.name ?? `#${t.tank_id}`,
          tier:     vehicles.get(t.tank_id)?.tier ?? 0,
          mastery:  t.mark_of_mastery,
          battles:  t.statistics.battles,
        }));

        // Distribution
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        for (const t of enriched) {
          counts[t.mastery as 0 | 1 | 2 | 3 | 4] = (counts[t.mastery as 0 | 1 | 2 | 3 | 4] ?? 0) + 1;
        }

        const lines: string[] = [
          `🏆 Mastery Badge Overview`,
          `════════════════════════════`,
          `🏆 Ace (4th)   : ${counts[4]}`,
          `🥇 1st Class   : ${counts[3]}`,
          `🥈 2nd Class   : ${counts[2]}`,
          `🥉 3rd Class   : ${counts[1]}`,
          `—  None        : ${counts[0]}`,
          `────────────────────────────`,
          `Total vehicles : ${enriched.length}`,
        ];

        // Ace Tankers sorted by tier desc
        const aces = enriched
          .filter(t => t.mastery === 4)
          .sort((a, b) => b.tier - a.tier || b.battles - a.battles);

        if (aces.length > 0) {
          lines.push('', `🏆 Ace Tankers (${aces.length})`);
          for (const t of aces) {
            const tier = (TIER_ROMAN[t.tier] ?? '?').padEnd(3);
            lines.push(`  ${tier} ${t.name.padEnd(20)} | ${formatNumber(t.battles)} bat.`);
          }
        }

        // 1st Class tanks (mastery 3) — next candidates for Ace
        const firstClass = enriched
          .filter(t => t.mastery === 3)
          .sort((a, b) => b.tier - a.tier || b.battles - a.battles)
          .slice(0, 20);

        if (firstClass.length > 0) {
          lines.push('', `🥇 1st Class — Potential Ace Candidates (top ${firstClass.length})`);
          for (const t of firstClass) {
            const tier = (TIER_ROMAN[t.tier] ?? '?').padEnd(3);
            lines.push(`  ${tier} ${t.name.padEnd(20)} | ${formatNumber(t.battles)} bat.`);
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_mastery_overview failed:', err);
        return {
          content: [{ type: 'text' as const, text: 'An error occurred while fetching mastery overview.' }],
          isError: true,
        };
      }
    },
  );
}
