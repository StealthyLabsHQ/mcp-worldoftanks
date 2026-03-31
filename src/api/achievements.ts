import { wgGet } from './client.js';

export interface AccountAchievements {
  achievements: Record<string, number>;
  frags: Record<string, number>;
  max_series: Record<string, number>;
  series: Record<string, number>;
}

export interface TankAchievement {
  tank_id: number;
  achievements: Record<string, number>;
  max_series: Record<string, number>;
  series: Record<string, number>;
}

/** Global achievements for the authenticated account. */
export async function getAccountAchievements(): Promise<AccountAchievements> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const data = await wgGet<Record<string, AccountAchievements | null>>('account/achievements/', {
    account_id: accountId,
  });

  return data[accountId] ?? { achievements: {}, frags: {}, max_series: {}, series: {} };
}

/** Per-tank achievements. If tankId is given, returns only that tank. */
export async function getTankAchievements(tankId?: number): Promise<TankAchievement[]> {
  const accountId = process.env.WG_ACCOUNT_ID;
  if (!accountId) throw new Error('WG_ACCOUNT_ID is not set');

  const params: Record<string, string | number | undefined> = {
    account_id: accountId,
  };
  if (tankId !== undefined) params.tank_id = tankId;

  const data = await wgGet<Record<string, TankAchievement[] | null>>('tanks/achievements/', params);

  return data[accountId] ?? [];
}
