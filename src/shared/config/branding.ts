export const BOT_NAME = process.env.BOT_NAME?.trim() || "OpenCapper";
export const WEBSITE_URL = (
  process.env.WEBSITE_URL?.trim() || "https://opencapper.coding-global.com"
).replace(/\/+$/, "");

export const BRAND_COLOR = 0x2b8a3e;
export const WIN_COLOR = 0x57f287;
export const LOSS_COLOR = 0xed4245;

export function profileUrl(username: string): string {
  return `${WEBSITE_URL}/en/u/${encodeURIComponent(username)}`;
}

export const NEUTRAL_COLOR = 0x99aab5;

// `?pick=` is the global pick id; a capper's own numbering needs `?user=&seq=`.
export function verifyUrl(pickId: string): string {
  return `${WEBSITE_URL}/en/verify?pick=${encodeURIComponent(pickId)}`;
}

export function verifySequenceUrl(username: string, sequence: number): string {
  return `${WEBSITE_URL}/en/verify?${new URLSearchParams({ user: username, seq: String(sequence) })}`;
}

export function checkUrl(query: string): string {
  return `${WEBSITE_URL}/en/check?q=${encodeURIComponent(query)}`;
}
