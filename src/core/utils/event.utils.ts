import type { ApiEvent } from "@/lib/api";

const STOP_WORDS = new Set(["vs", "v", "at", "and", "the"]);
const ALIASES: Record<string, string> = { utd: "united" };

function tokens(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map((w) => ALIASES[w] ?? w);
}

// "Kansas City Chiefs" gives "kcc" and "kc", "New York Giants" gives "nyg" and "ny".
function abbreviations(name: string): string[] {
  const words = tokens(name);
  if (words.length < 2) return [];
  const initials = words.map((w) => w[0]).join("");
  return [initials, initials.slice(0, -1)].filter((a) => a.length >= 2);
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

function tokenScore(query: string, word: string): number {
  if (word === query) return 4;
  if (word.startsWith(query)) return query.length >= 3 ? 3 : 1;
  if (query.length < 4) return 0;
  const typos = query.length >= 7 ? 2 : 1;
  if (editDistance(query, word) <= typos) return 2;
  // A typo inside a word that is still being typed: "baltmo" for "baltimore".
  if (editDistance(query, word.slice(0, query.length)) <= 1) return 1;
  return 0;
}

// Every query word must hit a team word, a prefix, an abbreviation or a near miss; order does not matter.
function eventScore(queryWords: string[], event: ApiEvent): number {
  const words = [...tokens(event.home), ...tokens(event.away)];
  const abbrevs = new Set([
    ...abbreviations(event.home),
    ...abbreviations(event.away),
  ]);
  let total = 0;
  for (const q of queryWords) {
    const best = Math.max(
      abbrevs.has(q) ? 4 : 0,
      ...words.map((w) => tokenScore(q, w)),
    );
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function eventLabel(e: ApiEvent): string {
  const when = new Date(e.commenceTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
  return `${e.away} @ ${e.home}, ${when} UTC`.slice(0, 100);
}

export function isUpcoming(e: ApiEvent, now = Date.now()): boolean {
  return new Date(e.commenceTime).getTime() > now;
}

interface ScoredEvent {
  event: ApiEvent;
  score: number;
}

function scoreEvents(events: ApiEvent[], query: string): ScoredEvent[] {
  const queryWords = tokens(query);
  const byTime = (a: ApiEvent, b: ApiEvent) =>
    Date.parse(a.commenceTime) - Date.parse(b.commenceTime);
  if (queryWords.length === 0) {
    return [...events].sort(byTime).map((event) => ({ event, score: 0 }));
  }
  return events
    .map((event) => ({ event, score: eventScore(queryWords, event) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byTime(a.event, b.event));
}

export function searchEvents(events: ApiEvent[], query: string): ApiEvent[] {
  return scoreEvents(
    events.filter((e) => isUpcoming(e)),
    query,
  ).map((s) => s.event);
}

export type EventResolution =
  | { kind: "found"; event: ApiEvent }
  | { kind: "ambiguous"; candidates: ApiEvent[] }
  | { kind: "none" };

// Discord lets a user submit typed text instead of a suggestion, so the value is an event id or a name.
export function resolveEvent(
  events: ApiEvent[],
  input: string,
): EventResolution {
  const value = input.trim();
  const exact = events.find((e) => e.id === value || eventLabel(e) === value);
  if (exact) return { kind: "found", event: exact };
  const scored = scoreEvents(
    events.filter((e) => isUpcoming(e)),
    value,
  );
  if (scored.length === 0 || tokens(value).length === 0)
    return { kind: "none" };
  if (scored.length === 1 || scored[0].score > scored[1].score) {
    return { kind: "found", event: scored[0].event };
  }
  const top = scored.filter((s) => s.score === scored[0].score);
  return { kind: "ambiguous", candidates: top.slice(0, 5).map((s) => s.event) };
}
