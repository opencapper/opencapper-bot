import {
  formatRecord,
  formatRoi,
  formatUnits,
} from "@/core/utils/command.utils";
import type { CheckMatch } from "@/lib/api";
import {
  BOT_NAME,
  LOSS_COLOR,
  NEUTRAL_COLOR,
  WIN_COLOR,
  profileUrl,
} from "@/shared/config/branding";
import { EmbedBuilder } from "discord.js";

// Live picks only: the ones locked through OpenCapper, not imported on chain history.
export function recordEmbed(match: CheckMatch): EmbedBuilder {
  const live = match.live;
  const url = profileUrl(match.username);
  const graded = live.graded > 0;
  const embed = new EmbedBuilder()
    .setColor(
      graded ? (live.units >= 0 ? WIN_COLOR : LOSS_COLOR) : NEUTRAL_COLOR,
    )
    .setTitle(match.username)
    .setURL(url)
    .addFields(
      { name: "Record", value: formatRecord(live), inline: true },
      { name: "Units", value: formatUnits(live.units), inline: true },
      {
        name: "ROI",
        value: graded ? formatRoi(live.roi) : "n/a",
        inline: true,
      },
      { name: "Graded picks", value: String(live.graded), inline: true },
      { name: "Pending", value: String(live.pending), inline: true },
      { name: "Profile", value: `[View full record](${url})`, inline: true },
    )
    .setFooter({ text: `${BOT_NAME} verified record` });
  if (!graded) {
    embed.setDescription(
      "No graded picks yet, so there is no record to judge.",
    );
  }
  if (match.avatarUrl) embed.setThumbnail(match.avatarUrl);
  return embed;
}

// `subject` is a user mention. Neutral on purpose: no profile is not proof of anything.
export function noProfileEmbed(subject: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(NEUTRAL_COLOR)
    .setTitle(`No ${BOT_NAME} record`)
    .setDescription(`${subject} has no picks on ${BOT_NAME}.`);
}
