import { wgGet } from './client.js';

export interface AccountTank {
  tank_id: number;
  mark_of_mastery: number;
  statistics: {
    battles: number;
    wins: number;
  };
}

export interface TankStatsAll {
  battles: number;
  wins: number;
  damage_dealt: number;
  frags: number;
  spotted: number;
  xp: number;
  max_xp: number;
  hits: number;
  shots: number;
  survived_battles: number;
  dropped_capture_points: number;
}

export interface TankStats {
  tank_id: number;
  mark_of_mastery: number;
  all: TankStatsAll;
}

/** Get simplified tank list for a player (garage). */
export async function getAccountTanks(): Promise<AccountTank[]> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const data = await wgGet<Record<string, AccountTank[] | null>>('account/tanks/', {
    account_id: accountId,
  });

  return data[accountId] ?? [];
}

/** Get detailed stats for one or all tanks. */
export async function getTankStats(tankId?: number): Promise<TankStats[]> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const params: Record<string, string | number | undefined> = {
    account_id: accountId,
  };
  if (tankId !== undefined) params.tank_id = tankId;

  const data = await wgGet<Record<string, TankStats[] | null>>('tanks/stats/', params);

  return data[accountId] ?? [];
}
