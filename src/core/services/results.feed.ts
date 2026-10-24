import { resultEmbed } from "@/core/embeds/result.embed";
import { ApiError, api, type ApiSettledPick } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  ChannelType,
  type Client,
  type Guild,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INTERVAL_MS = 5 * 60 * 1000;
const MAX_PER_TICK = 50;
const CHANNEL_NAME = (
  process.env.RESULTS_CHANNEL?.trim() || "results"
).toLowerCase();
const DATA_DIR = process.env.DATA_DIR?.trim() || "/app/data";
const STATE_FILE = join(DATA_DIR, "results-watermarks.json");

const watermarks = new Map<string, string>();
let running = false;
let missingEndpointLogged = false;

async function loadWatermarks(): Promise<void> {
  try {
    const parsed: unknown = JSON.parse(await readFile(STATE_FILE, "utf-8"));
    if (typeof parsed !== "object" || parsed === null) return;
    for (const [guildId, since] of Object.entries(parsed)) {
      if (typeof since === "string" && !Number.isNaN(Date.parse(since))) {
        watermarks.set(guildId, since);
      }
    }
    logger.info("Results watermarks loaded", { guilds: watermarks.size });
  } catch (err) {
    logger.info("No results watermarks on disk", { error: String(err) });
  }
}

// Write then rename so a crash mid write never leaves a truncated file.
async function saveWatermarks(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${STATE_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(Object.fromEntries(watermarks)));
    await rename(tmp, STATE_FILE);
  } catch (err) {
    logger.warn("Saving results watermarks failed", { error: String(err) });
  }
}

function resultsChannel(guild: Guild): TextChannel | null {
  const me = guild.members.me;
  if (!me) return null;
  return (
    guild.channels.cache.find(
      (c): c is TextChannel =>
        c.type === ChannelType.GuildText &&
        c.name.toLowerCase().includes(CHANNEL_NAME) &&
        c
          .permissionsFor(me)
          .has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ]),
    ) ?? null
  );
}

// Returns false when the endpoint is not deployed, so the tick stops early.
async function pollGuild(guild: Guild): Promise<boolean> {
  const channel = resultsChannel(guild);
  if (!channel) return true;

  let since = watermarks.get(guild.id);
  if (!since) {
    // First sight starts now, so adding the bot never floods old results.
    since = new Date().toISOString();
    watermarks.set(guild.id, since);
    await saveWatermarks();
  }

  let picks: ApiSettledPick[];
  try {
    picks = await api.settledPicks(guild.id, new Date(since));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      if (!missingEndpointLogged) {
        logger.info("Settled picks endpoint not available yet");
        missingEndpointLogged = true;
      }
      return false;
    }
    logger.warn("Settled picks fetch failed", {
      guildId: guild.id,
      error: String(err),
    });
    return true;
  }
  missingEndpointLogged = false;

  const sinceMs = Date.parse(since);
  const fresh = picks
    .filter((p) => p.result !== "pending" && Date.parse(p.settledAt) > sinceMs)
    .sort((a, b) => Date.parse(a.settledAt) - Date.parse(b.settledAt))
    .slice(0, MAX_PER_TICK);

  for (const pick of fresh) {
    await channel
      .send({ embeds: [resultEmbed(pick)], allowedMentions: { parse: [] } })
      .catch((err) =>
        logger.warn("Posting result failed", {
          guildId: guild.id,
          pickId: pick.id,
          error: String(err),
        }),
      );
    watermarks.set(guild.id, pick.settledAt);
  }
  if (fresh.length) await saveWatermarks();
  return true;
}

async function tick(client: Client): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const guild of client.guilds.cache.values()) {
      if (!(await pollGuild(guild))) break;
    }
  } catch (err) {
    logger.error("Results feed tick failed", { error: String(err) });
  } finally {
    running = false;
  }
}

export async function startResultsFeed(client: Client): Promise<void> {
  await loadWatermarks();
  void tick(client);
  setInterval(() => void tick(client), INTERVAL_MS);
}
