export const LEADERBOARD_PERIODS = [
  { name: "Last 30 days", value: "30d" },
  { name: "Last 90 days", value: "90d" },
  { name: "Last year", value: "1y" },
  { name: "All time", value: "all" },
] as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number]["value"];

export function isLeaderboardPeriod(
  value: unknown,
): value is LeaderboardPeriod {
  return LEADERBOARD_PERIODS.some((p) => p.value === value);
}

export function periodLabel(key: string): string {
  return LEADERBOARD_PERIODS.find((p) => p.value === key)?.name ?? key;
}

// The API ranks by sport group (SPORT_GROUPS in the API repo), not by Odds API sport key.
export const LEADERBOARD_SPORTS = [
  { name: "American football", value: "americanfootball" },
  { name: "Basketball", value: "basketball" },
  { name: "Baseball", value: "baseball" },
  { name: "Ice hockey", value: "icehockey" },
  { name: "Soccer", value: "soccer" },
  { name: "Tennis", value: "tennis" },
  { name: "Golf", value: "golf" },
  { name: "MMA", value: "mma" },
  { name: "Boxing", value: "boxing" },
  { name: "Cricket", value: "cricket" },
  { name: "Aussie rules", value: "aussierules" },
  { name: "Rugby", value: "rugby" },
] as const;

export type LeaderboardSport = (typeof LEADERBOARD_SPORTS)[number]["value"];

export function isLeaderboardSport(value: unknown): value is LeaderboardSport {
  return LEADERBOARD_SPORTS.some((s) => s.value === value);
}

export function leaderboardSportLabel(key: string): string {
  return LEADERBOARD_SPORTS.find((s) => s.value === key)?.name ?? key;
}
