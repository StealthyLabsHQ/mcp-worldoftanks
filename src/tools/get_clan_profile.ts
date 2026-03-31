import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPlayerClanInfo, getClanInfo, getStrongholdInfo } from '../api/clans.js';
import { formatDate, formatNumber } from '../utils/format.js';
import { logger } from '../utils/logger.js';

const SH_LEAGUE: Record<number, string> = {
  0: 'No League',
  1: '🥉 Bronze',
  2: '🥈 Silver',
  3: '🥇 Gold',
  4: '💎 Champion',
};

export function registerClanProfile(server: McpServer): void {
  server.tool(
    'wot_get_clan_profile',
    'Clan profile and stronghold info for the authenticated player\'s clan.',
    {},
    async () => {
      try {
        const membership = await getPlayerClanInfo();

        if (!membership) {
          return { content: [{ type: 'text' as const, text: '🏰 Not in a clan.' }] };
        }

        const [clanInfo, shInfo] = await Promise.all([
          getClanInfo(membership.clan_id!),
          getStrongholdInfo(membership.clan_id!),
        ]);

        const lines: string[] = [
          `🏰 Clan Profile`,
          `════════════════════════════`,
        ];

        if (clanInfo) {
          lines.push(
            `Tag        : [${clanInfo.tag}]`,
            `Name       : ${clanInfo.name}`,
            `Members    : ${clanInfo.members_count}`,
            `Created    : ${formatDate(clanInfo.created_at)}`,
          );
          if (clanInfo.motto)   lines.push(`Motto      : ${clanInfo.motto}`);
          if (clanInfo.is_clan_disbanded) lines.push(`⚠️  This clan is disbanded.`);
        } else if (membership.clan) {
          lines.push(
            `Tag        : [${membership.clan.tag}]`,
            `Name       : ${membership.clan.name}`,
            `Members    : ${membership.clan.members_count}`,
          );
        }

        lines.push(
          ``,
          `👤 Your Role`,
          `────────────────────────────`,
          `Role       : ${membership.role_i18n || membership.role}`,
          `Joined     : ${formatDate(membership.joined_at)}`,
        );

        if (shInfo) {
          const shWinRate = shInfo.battles_count > 0
            ? ((shInfo.wins_count / shInfo.battles_count) * 100).toFixed(1) + '%'
            : 'N/A';
          const leagueLabel = SH_LEAGUE[shInfo.league ?? 0] ?? 'Unknown';

          lines.push(
            ``,
            `🏯 Stronghold`,
            `────────────────────────────`,
            `Level      : ${shInfo.level ?? 'N/A'}`,
            `League     : ${leagueLabel}`,
            `Battles    : ${formatNumber(shInfo.battles_count)}`,
            `SH Win Rate: ${shWinRate}`,
          );
        } else {
          lines.push(``, `🏯 Stronghold: data unavailable`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        logger.error('get_clan_profile failed:', err);
        return {
          content: [{ type: 'text' as const, text: 'An error occurred while fetching clan profile.' }],
          isError: true,
        };
      }
    },
  );
}
