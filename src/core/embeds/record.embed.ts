import {
  formatRecord,
  formatRoi,
  formatUnits,
} from "@/core/utils/command.utils";
import type { CapperStats } from "@/lib/api";
import {
  BOT_NAME,
  LOSS_COLOR,
  WIN_COLOR,
  profileUrl,
} from "@/shared/config/branding";
import { EmbedBuilder } from "discord.js";

export function recordEmbed(stats: CapperStats): EmbedBuilder {
  const url = profileUrl(stats.username);
  return new EmbedBuilder()
    .setColor(stats.units >= 0 ? WIN_COLOR : LOSS_COLOR)
    .setTitle(stats.username)
    .setURL(url)
    .addFields(
      { name: "Record", value: formatRecord(stats), inline: true },
      { name: "Units", value: formatUnits(stats.units), inline: true },
      { name: "ROI", value: formatRoi(stats.roi), inline: true },
      { name: "Picks", value: String(stats.picks), inline: true },
      { name: "Pending", value: String(stats.pending), inline: true },
      { name: "Profile", value: `[View full record](${url})`, inline: true },
    )
    .setFooter({ text: `${BOT_NAME} verified record` });
}
