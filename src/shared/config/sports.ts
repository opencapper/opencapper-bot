export const SPORTS = [
  { name: "NFL", value: "americanfootball_nfl" },
  { name: "NBA", value: "basketball_nba" },
  { name: "MLB", value: "baseball_mlb" },
  { name: "NHL", value: "icehockey_nhl" },
  { name: "MMA", value: "mma_mixed_martial_arts" },
  { name: "Soccer EPL", value: "soccer_epl" },
] as const;

export type SportKey = (typeof SPORTS)[number]["value"];

export function isSportKey(value: unknown): value is SportKey {
  return SPORTS.some((s) => s.value === value);
}

export function sportLabel(key: string): string {
  return SPORTS.find((s) => s.value === key)?.name ?? key;
}

export const MARKETS = [
  { name: "Moneyline", value: "h2h" },
  { name: "Spread", value: "spreads" },
  { name: "Total", value: "totals" },
  { name: "Method of victory", value: "method" },
  { name: "Period or round", value: "period_win" },
  { name: "Goes the distance", value: "distance" },
] as const;

export type Market = (typeof MARKETS)[number]["value"];

// Selections the API offers as a fixed list (fight sports today); the user picks one instead of typing.
const SHAPE_MARKETS: readonly string[] = ["method", "period_win", "distance"];

export function isShapeMarket(value: string): boolean {
  return SHAPE_MARKETS.includes(value);
}

export function isMarket(value: unknown): value is Market {
  return MARKETS.some((m) => m.value === value);
}

export function marketLabel(key: string): string {
  return MARKETS.find((m) => m.value === key)?.name ?? key;
}
