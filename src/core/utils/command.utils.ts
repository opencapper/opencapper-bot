import { ApiError } from "@/lib/api";
import {
  type CommandInteraction,
  type InteractionDeferReplyOptions,
  type InteractionEditReplyOptions,
  MessageFlags,
} from "discord.js";

const UNKNOWN_MESSAGE = 10008;
const UNKNOWN_CHANNEL = 10003;
const UNKNOWN_INTERACTION = 10062;

function discordCode(error: unknown): number | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return typeof error.code === "number" ? error.code : undefined;
  }
  return undefined;
}

export async function safeDeferReply(
  interaction: CommandInteraction,
  options?: InteractionDeferReplyOptions,
): Promise<boolean> {
  try {
    await interaction.deferReply(options);
    return true;
  } catch (error) {
    if (discordCode(error) === UNKNOWN_INTERACTION) return false;
    throw error;
  }
}

export async function safeEditReply(
  interaction: CommandInteraction,
  options: string | InteractionEditReplyOptions,
): Promise<boolean> {
  try {
    await interaction.editReply(options);
    return true;
  } catch (error) {
    const code = discordCode(error);
    if (
      code === UNKNOWN_MESSAGE ||
      code === UNKNOWN_CHANNEL ||
      code === UNKNOWN_INTERACTION
    ) {
      return false;
    }
    throw error;
  }
}

const FAILURE_TTL_MS = 60_000;

// A public deferred reply cannot turn ephemeral. Deleting it and following up leaves a
// "Message could not be loaded" stub, so the error goes into the reply and removes itself.
export async function replyFailure(
  interaction: CommandInteraction,
  error: unknown,
): Promise<void> {
  if (!(error instanceof ApiError)) throw error;
  if (!interaction.deferred && !interaction.replied) {
    await interaction
      .reply({ content: error.message, flags: [MessageFlags.Ephemeral] })
      .catch(() => {});
    return;
  }
  const removeAt = Math.floor((Date.now() + FAILURE_TTL_MS) / 1000);
  const edited = await safeEditReply(interaction, {
    content: `${error.message}\n-# This message disappears <t:${removeAt}:R>.`,
    embeds: [],
    components: [],
    allowedMentions: { parse: [] },
  }).catch(() => false);
  if (!edited) return;
  setTimeout(
    () => void interaction.deleteReply().catch(() => {}),
    FAILURE_TTL_MS,
  ).unref();
}

export function replyEphemeral(
  interaction: CommandInteraction,
  content: string,
): Promise<unknown> {
  return interaction
    .reply({
      content,
      flags: [MessageFlags.Ephemeral],
      allowedMentions: { parse: [] },
    })
    .catch(() => {});
}

export function fitLines(lines: string[], limit: number): string {
  let content = "";
  for (const line of lines) {
    if (content.length + line.length + 1 > limit) break;
    content += (content ? "\n" : "") + line;
  }
  return content;
}

export function formatUnits(units: number): string {
  return `${units > 0 ? "+" : ""}${units.toFixed(2)}u`;
}

export function formatRoi(roi: number): string {
  return `${roi > 0 ? "+" : ""}${(roi * 100).toFixed(1)}%`;
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds);
}

export function formatRecord(s: {
  wins: number;
  losses: number;
  pushes: number;
}): string {
  return `${s.wins}W ${s.losses}L${s.pushes ? ` ${s.pushes}P` : ""}`;
}
