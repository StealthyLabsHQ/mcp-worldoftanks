import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAccountAchievements, getTankAchievements } from '../api/achievements.js';
import { searchByName, resolveVehicles } from '../api/encyclopedia.js';
import { logger } from '../utils/logger.js';

// Human-readable names for notable achievements
const NOTABLE: Record<string, string> = {
  medalRadleyWalters:   'Radley-Walters Medal (8+ kills)',
  medalLehvaslaiho:     'Lehvaslaiho Medal (6+ kills, light/med)',
  medalNikolou:         'Nikolou Medal (6+ kills, heavy)',
  medalOrlik:           'Orlik Medal (5+ kills, medium)',
  medalHalonen:         'Halonen Medal (5+ kills, light)',
  medalBurda:           'Burda Medal (5+ kills)',
  medalTarczay:         'Tarczay Medal (5+ kills, heavy)',
  medalPopescu:         'Popescu Medal (5+ kills, TD)',
  medalDeLanglade:      'de Langlade Medal (5+ kills, medium)',
  markOfMastery:        'Ace Tanker (Mark of Mastery)',
  marksOnGun:           'Marks of Excellence (gun barrel)',
  medalKnispel:         'Knispel Medal (top damage)',
  medalCarius:          'Carius Medal (top kills)',
  medalAbrams:          'Abrams Medal (top spotting)',
  medalPoppel:          'Poppel Medal (top frags)',
  medalEkins:           'Ekins Medal (top frags)',
  medalLeClerc:         'LeClerc Medal (top kills)',
  heroesOfRassenay:     'Heroes of Rassenay',
  titleSniper:          'Sniper (85%+ hit rate)',
  invader:              'Invader (capture points)',
  defender:             'Defender (defense points)',
  handOfDeath:          'Hand of Death (multiple kills)',
  kamikaze:             'Kamikaze (ram kill)',
  spartan:              'Spartan (survived, last alive)',
};

function toReadable(key: string): string {
  return NOTABLE[key] ?? key.replace(/([A-Z])/g, ' $1').trim();
}

export function registerAchievements(server: McpServer): void {
  server.tool(
    'wot_get_achievements',
    'Account-wide or per-tank achievements and medals. Without parameters returns top achievements globally; with tank_name or tank_id filters to that tank.',
    {
      tank_name: z.string().max(100).optional().describe('Tank name (approximate search)'),
      tank_id:   z.number().int().min(1).max(999999).optional().describe('Tank ID'),
    },
    async ({ tank_name, tank_id }) => {
      try {
        // Per-tank mode
        if (tank_name || tank_id !== undefined) {
          let resolvedId = tank_id;

          if (tank_name && resolvedId === undefined) {
            const matches = await searchByName(tank_name);
            if (matches.length === 0) {
              return { content: [{ type: 'text' as const, text: `No tank found for "${tank_name}".` }], isError: true };
            }
            if (matches.length > 1) {
              const list = matches.slice(0, 10).map(m => `  - ${m.name} (Tier ${m.tier}, ${m.nation})`).join('\n');
              return { content: [{ type: 'text' as const, text: `Multiple tanks match "${tank_name}":\n${list}\n\nPlease be more specific or use tank_id.` }] };
            }
            resolvedId = matches[0].tank_id;
          }

          const tankAchievements = await getTankAchievements(resolvedId);
          const entry = tankAchievements.find(t => t.tank_id === resolvedId);

          const vehicles = await resolveVehicles([resolvedId!]);
          const v = vehicles.get(resolvedId!);
          const tankLabel = v?.name ?? `Tank #${resolvedId}`;

          const lines = [
            `🏅 Achievements — ${tankLabel}`,
            `════════════════════════════`,
          ];

          if (!entry || Object.keys(entry.achievements).length === 0) {
            lines.push('No achievements on this tank yet.');
          } else {
            const sorted = Object.entries(entry.achievements)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a);

            for (const [key, count] of sorted) {
              lines.push(`  ${toReadable(key).padEnd(40)} × ${count}`);
            }

            if (Object.keys(entry.max_series).length > 0) {
              lines.push('', '📈 Best Series');
              for (const [key, val] of Object.entries(entry.max_series)) {
                if (val > 0) lines.push(`  ${toReadable(key).padEnd(40)} : ${val}`);
              }
            }
          }

          return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
        }

        // Account-wide mode
        const acct = await getAccountAchievements();

        const sorted = Object.entries(acct.achievements)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 25);

        const lines = [
          `🏅 Account Achievements`,
          `════════════════════════════`,
        ];

        if (sorted.length === 0) {
          lines.push('No achievements found.');
        } else {
          lines.push('Top medals (by count):');
          for (const [key, count] of sorted) {
            lines.push(`  ${toReadable(key).padEnd(40)} × ${count}`);
          }
        }

        // Notable max series
        const notableSeries = Object.entries(acct.max_series)
          .filter(([, val]) => val > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        if (notableSeries.length > 0) {
          lines.push('', '📈 Best Series Records');
          for (const [key, val] of notableSeries) {
            lines.push(`  ${toReadable(key).padEnd(40)} : ${val}`);
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_achievements failed:', err);
        return {
          content: [{ type: 'text' as const, text: 'An error occurred while fetching achievements.' }],
          isError: true,
        };
      }
    },
  );
}
