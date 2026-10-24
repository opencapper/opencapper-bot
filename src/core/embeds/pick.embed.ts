import { formatOdds } from "@/core/utils/command.utils";
import {
  matchupTitle,
  pickAuthor,
  pickThumbnail,
} from "@/core/utils/pick.utils";
import type { ApiPick } from "@/lib/api";
import { BRAND_COLOR, profileUrl, verifyUrl } from "@/shared/config/branding";
import { marketLabel } from "@/shared/config/sports";
import { EmbedBuilder } from "discord.js";

export function pickEmbed(pick: ApiPick): EmbedBuilder {
  const url = profileUrl(pick.username);
  const kickoff = Math.floor(new Date(pick.commenceTime).getTime() / 1000);
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: pickAuthor(pick), url })
    .setTitle(matchupTitle(pick))
    .setURL(url)
    .setThumbnail(pickThumbnail(pick))
    .setDescription(`**${pick.selection}** (${marketLabel(pick.market)})`)
    .addFields(
      { name: "Units", value: `${pick.units}u`, inline: true },
      { name: "Odds", value: formatOdds(pick.odds), inline: true },
      { name: "Bookmaker", value: pick.bookmaker, inline: true },
      { name: "Starts", value: `<t:${kickoff}:f>`, inline: true },
      { name: "Pick", value: `#${pick.sequence}`, inline: true },
      {
        name: "Record",
        value: `[View profile](${url}), [Verify](${verifyUrl(pick.id)})`,
        inline: true,
      },
    )
    .setFooter({ text: "Locked" })
    .setTimestamp(new Date(pick.createdAt));
}
