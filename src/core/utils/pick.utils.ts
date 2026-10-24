import type { ApiPick } from "@/lib/api";
import { sportLabel } from "@/shared/config/sports";

type Participants = Pick<
  ApiPick,
  "home" | "away" | "homeImage" | "awayImage" | "homeCountry" | "awayCountry"
>;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
}

function sideScore(selection: string, name: string): number {
  const sel = selection.toLowerCase();
  if (sel.includes(name.toLowerCase())) return Number.MAX_SAFE_INTEGER;
  const selWords = new Set(words(selection));
  return words(name).filter((w) => selWords.has(w)).length;
}

// Totals name no side, and shared city words can tie; both fall back to home.
export function pickedSide(
  p: Pick<ApiPick, "home" | "away" | "selection">,
): "home" | "away" | null {
  const home = sideScore(p.selection, p.home);
  const away = sideScore(p.selection, p.away);
  if (home === away) return null;
  return home > away ? "home" : "away";
}

export function pickThumbnail(
  p: Participants & Pick<ApiPick, "selection">,
): string | null {
  const side = pickedSide(p);
  const image = side === "away" ? p.awayImage : p.homeImage;
  return image || p.homeImage || p.awayImage || null;
}

function withCountry(name: string, country?: string | null): string {
  return country ? `${name} (${country})` : name;
}

export function matchupTitle(p: Participants): string {
  return `${withCountry(p.away, p.awayCountry)} @ ${withCountry(p.home, p.homeCountry)}`.slice(
    0,
    256,
  );
}

export function pickAuthor(p: Pick<ApiPick, "sportKey" | "username">): string {
  return `${sportLabel(p.sportKey)} | ${p.username}`;
}
