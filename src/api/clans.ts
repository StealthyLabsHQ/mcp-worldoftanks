import { wgGet } from './client.js';
import { logger } from '../utils/logger.js';

export interface ClanMemberInfo {
  clan_id: number | null;
  account_id: number;
  joined_at: number;
  role: string;
  role_i18n: string;
  clan: {
    clan_id: number;
    tag: string;
    name: string;
    members_count: number;
    color: string | null;
  } | null;
}

export interface ClanInfo {
  clan_id: number;
  tag: string;
  name: string;
  motto: string | null;
  description: string | null;
  members_count: number;
  created_at: number;
  color: string | null;
  is_clan_disbanded: boolean;
}

export interface StrongholdInfo {
  level: number | null;
  league: number | null;
  battles_count: number;
  wins_count: number;
}

/** Returns the clan membership of the authenticated player, or null if not in a clan. */
export async function getPlayerClanInfo(): Promise<ClanMemberInfo | null> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const data = await wgGet<Record<string, ClanMemberInfo | null>>('clans/accountinfo/', {
    account_id: accountId,
    extra: 'clan',
  });

  const info = data[accountId];
  if (!info || info.clan_id === null) return null;
  return info;
}

/** Returns detailed info about a clan. */
export async function getClanInfo(clanId: number): Promise<ClanInfo | null> {
  const data = await wgGet<Record<string, ClanInfo | null>>('clans/info/', {
    clan_id: clanId,
  });

  return data[String(clanId)] ?? null;
}

/** Returns stronghold data for a clan. Returns null if unavailable. */
export async function getStrongholdInfo(clanId: number): Promise<StrongholdInfo | null> {
  try {
    const data = await wgGet<Record<string, StrongholdInfo | null>>('stronghold/claninfo/', {
      clan_id: clanId,
    });
    return data[String(clanId)] ?? null;
  } catch (e) {
    logger.debug('Stronghold info not available for clan', clanId, e);
    return null;
  }
}
