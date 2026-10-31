import {
  fitLines,
  formatRecord,
  formatRoi,
  formatUnits,
} from "@/core/utils/command.utils";
import type { LeaderboardResponse } from "@/lib/api";
import { BOT_NAME, BRAND_COLOR, profileUrl } from "@/shared/config/branding";
import {
  type LeaderboardPeriod,
  type LeaderboardSport,
  leaderboardSportLabel,
  periodLabel,
} from "@/shared/config/leaderboard";
import { EmbedBuilder } from "discord.js";

export function leaderboardEmbed(
  board: LeaderboardResponse,
  sport: LeaderboardSport | null,
  period: LeaderboardPeriod,
): EmbedBuilder {
  const lines = board.rows
    .slice(0, 10)
    .map(
      (r) =>
        `**${r.rank}. [${r.username}](${profileUrl(r.username)})** ROI ${formatRoi(r.roi)}, ${formatUnits(r.units)}, ${formatRecord(r)} (${r.graded} graded)`,
    );
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(
      `Leaderboard: ${sport ? leaderboardSportLabel(sport) : "All sports"}, ${periodLabel(period)}`,
    )
    .setDescription(
      lines.length ? fitLines(lines, 4000) : "No ranked cappers yet.",
    )
    .setFooter({
      text: `${BOT_NAME} verified record. Minimum ${board.minGraded} graded picks to rank, ${board.total} ranked`,
    });
}
