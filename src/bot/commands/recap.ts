import { recapEmbed } from "@/core/embeds/recap.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { api } from "@/lib/api";
import {
  ApplicationCommandOptionType,
  CommandInteraction,
  InteractionContextType,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

const DAY_MS = 24 * 60 * 60 * 1000;

@Discord()
export class RecapCommand {
  @Slash({
    name: "recap",
    description: "Post the graded record of every capper in this server",
    contexts: [InteractionContextType.Guild],
  })
  async recap(
    @SlashOption({
      name: "days",
      description: "How many days back (default 7)",
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 365,
    })
    days: number | undefined,
    interaction: CommandInteraction,
  ) {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const span = days ?? 7;
    if (!(await safeDeferReply(interaction))) return;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - span * DAY_MS);
      const recap = await api.recap(guildId, from, to);
      await safeEditReply(interaction, {
        embeds: [recapEmbed(recap, span)],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
