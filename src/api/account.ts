import { wgGet } from './client.js';

export interface AccountPrivate {
  credits: number;
  gold: number;
  free_xp: number;
  bonds: number;
  is_premium: boolean;
  premium_expires_at: number;
  battle_life_time: number;
  ban_info: string | null;
  ban_time: number | null;
}

export interface AccountStatistics {
  battles: number;
  wins: number;
  damage_dealt: number;
  frags: number;
  spotted: number;
  xp: number;
  hits: number;
  shots: number;
  survived_battles: number;
  dropped_capture_points: number;
}

export interface AccountInfo {
  account_id: number;
  nickname: string;
  created_at: number;
  updated_at: number;
  last_battle_time: number;
  private: AccountPrivate | null;
  statistics: {
    all: AccountStatistics;
  };
}

export async function getAccountInfo(): Promise<AccountInfo> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const data = await wgGet<Record<string, AccountInfo>>('account/info/', {
    account_id: accountId,
  });

  const info = data[accountId];
  if (!info) throw new Error(`No data returned for account ${accountId}`);

  // Null-safe defaults for private fields
  if (info.private) {
    info.private.credits = info.private.credits ?? 0;
    info.private.gold = info.private.gold ?? 0;
    info.private.free_xp = info.private.free_xp ?? 0;
    info.private.bonds = info.private.bonds ?? 0;
  }

  return info;
}
