import {
  fitLines,
  formatRecord,
  formatRoi,
  formatUnits,
} from "@/core/utils/command.utils";
import type { RecapResponse } from "@/lib/api";
import { BOT_NAME, BRAND_COLOR, profileUrl } from "@/shared/config/branding";
import { EmbedBuilder } from "discord.js";

export function recapEmbed(recap: RecapResponse, days: number): EmbedBuilder {
  const cappers = [...recap.cappers].sort((a, b) => b.units - a.units);
  const lines = cappers.map(
    (c, i) =>
      `**${i + 1}. [${c.username}](${profileUrl(c.username)})** ${formatRecord(c)}, ${formatUnits(c.units)}, ROI ${formatRoi(c.roi)}`,
  );
  const total = cappers.reduce((sum, c) => sum + c.units, 0);
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Recap: last ${days} day${days === 1 ? "" : "s"}`)
    .setDescription(
      lines.length ? fitLines(lines, 4000) : "No graded picks in this period.",
    )
    .setFooter({
      text: `${BOT_NAME} verified record. Server total ${formatUnits(total)}`,
    })
    .setTimestamp(new Date(recap.to));
}
