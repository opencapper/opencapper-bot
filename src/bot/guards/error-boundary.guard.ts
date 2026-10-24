import { logger } from "@/lib/logger";
import { BaseInteraction, MessageFlags } from "discord.js";
import type { GuardFunction } from "discordx";

const FALLBACK = "Something went wrong. Try again in a moment.";

// discordx has no error middleware; without this a throw escapes to unhandledRejection and the user sees nothing.
export const ErrorBoundary: GuardFunction = async (arg, _client, next) => {
  try {
    await next();
  } catch (err) {
    const item = Array.isArray(arg) ? arg[0] : arg;
    const interaction =
      item instanceof BaseInteraction && item.isRepliable() ? item : null;
    logger.error("Unhandled handler error", {
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
      interaction: interaction?.id,
    });
    if (!interaction) return;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(FALLBACK).catch(() => {});
    } else {
      await interaction
        .reply({ content: FALLBACK, flags: [MessageFlags.Ephemeral] })
        .catch(() => {});
    }
  }
};
