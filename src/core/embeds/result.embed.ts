import { formatOdds, formatRoi, formatUnits } from "@/core/utils/command.utils";
import {
  matchupTitle,
  pickAuthor,
  pickThumbnail,
} from "@/core/utils/pick.utils";
import type { ApiSettledPick, PickResult } from "@/lib/api";
import {
  LOSS_COLOR,
  NEUTRAL_COLOR,
  WIN_COLOR,
  profileUrl,
  verifyUrl,
} from "@/shared/config/branding";
import { marketLabel } from "@/shared/config/sports";
import { EmbedBuilder } from "discord.js";

const LABELS: Record<PickResult, string> = {
  pending: "Pending",
  win: "Win",
  loss: "Loss",
  push: "Push",
  void: "Void",
};

// Odds are American, so profit per unit staked is odds/100 or 100/|odds|.
export function unitsResult(pick: ApiSettledPick): number {
  if (pick.result === "loss") return -pick.units;
  if (pick.result !== "win") return 0;
  const perUnit = pick.odds > 0 ? pick.odds / 100 : 100 / Math.abs(pick.odds);
  return pick.units * perUnit;
}

function resultColor(result: PickResult): number {
  if (result === "win") return WIN_COLOR;
  if (result === "loss") return LOSS_COLOR;
  return NEUTRAL_COLOR;
}

export function resultEmbed(pick: ApiSettledPick): EmbedBuilder {
  const url = profileUrl(pick.username);
  const odds =
    pick.closingOdds == null
      ? formatOdds(pick.odds)
      : `${formatOdds(pick.odds)}, closed ${formatOdds(pick.closingOdds)}`;
  const lines = [
    `**${pick.selection}** (${marketLabel(pick.market)}), ${pick.units}u`,
    `Odds ${odds}${pick.clv == null ? "" : `, CLV ${formatRoi(pick.clv)}`}`,
    `[View profile](${url}), [Verify](${verifyUrl(pick.id)})`,
  ];
  return new EmbedBuilder()
    .setColor(resultColor(pick.result))
    .setAuthor({ name: pickAuthor(pick), url })
    .setTitle(
      `${LABELS[pick.result]} ${formatUnits(unitsResult(pick))}: ${matchupTitle(pick)}`.slice(
        0,
        256,
      ),
    )
    .setURL(url)
    .setThumbnail(pickThumbnail(pick))
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Pick #${pick.sequence} settled` })
    .setTimestamp(new Date(pick.settledAt));
}
