import { leaderboardEmbed } from "@/core/embeds/leaderboard.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { ApiError, api } from "@/lib/api";
import {
  LEADERBOARD_PERIODS,
  LEADERBOARD_SPORTS,
  isLeaderboardPeriod,
  isLeaderboardSport,
} from "@/shared/config/leaderboard";
import {
  ApplicationCommandOptionType,
  CommandInteraction,
  InteractionContextType,
} from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";

@Discord()
export class LeaderboardCommand {
  @Slash({
    name: "leaderboard",
    description: "Top cappers by ROI across OpenCapper",
    contexts: [InteractionContextType.Guild],
  })
  async leaderboard(
    @SlashChoice(...LEADERBOARD_SPORTS)
    @SlashOption({
      name: "sport",
      description: "Sport (default all)",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    sport: string | undefined,
    @SlashChoice(...LEADERBOARD_PERIODS)
    @SlashOption({
      name: "period",
      description: "Time window (default 30 days)",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    period: string | undefined,
    interaction: CommandInteraction,
  ) {
    const group = isLeaderboardSport(sport) ? sport : null;
    const window = isLeaderboardPeriod(period) ? period : "30d";
    if (!(await safeDeferReply(interaction))) return;
    try {
      const board = await api.leaderboard(group, window);
      await safeEditReply(interaction, {
        embeds: [leaderboardEmbed(board, group, window)],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        await safeEditReply(interaction, "The leaderboard is coming soon.");
        return;
      }
      await replyFailure(interaction, err);
    }
  }
}
