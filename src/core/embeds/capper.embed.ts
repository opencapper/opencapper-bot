import {
  formatRecord,
  formatRoi,
  formatUnits,
} from "@/core/utils/command.utils";
import type { CapperCheck, CheckMatch, CheckRecord } from "@/lib/api";
import {
  BOT_NAME,
  LOSS_COLOR,
  NEUTRAL_COLOR,
  WIN_COLOR,
  profileUrl,
} from "@/shared/config/branding";
import { EmbedBuilder, escapeMarkdown } from "discord.js";

export const NO_RECORD_WARNING =
  "Anyone selling picks without a public record cannot prove it. Ask for their OpenCapper link.";

const STATUS: Record<CheckMatch["status"], string> = {
  member: "Verified member",
  imported: "Public profile, imported",
  claimed: "Public profile, claimed",
};

function line(label: string, record: CheckRecord): string {
  const roi = record.graded > 0 ? `ROI ${formatRoi(record.roi)}` : "no ROI";
  return `${label}: ${formatRecord(record)}, ${formatUnits(record.units)}, ${roi}`;
}

function color(record: CheckRecord): number {
  if (record.graded === 0) return NEUTRAL_COLOR;
  return record.units >= 0 ? WIN_COLOR : LOSS_COLOR;
}

// `subject` is a user mention or the escaped name that was searched.
export function noRecordEmbed(subject: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(LOSS_COLOR)
    .setTitle("No verified record")
    .setDescription(
      `No verified ${BOT_NAME} record for ${subject}.\n\n${NO_RECORD_WARNING}`,
    )
    .setFooter({ text: `${BOT_NAME} capper check` });
}

export function capperEmbed(check: CapperCheck): EmbedBuilder {
  const match = check.matches[0];
  const total = match.total;
  const url = profileUrl(match.username);
  const status = match.claimedBy
    ? `${STATUS[match.status]} by ${escapeMarkdown(match.claimedBy)}`
    : STATUS[match.status];
  const lastPick = match.lastPickAt
    ? `<t:${Math.floor(new Date(match.lastPickAt).getTime() / 1000)}:R>`
    : "None yet";
  const split = [line("Live", match.live)];
  if (match.history) split.push(line("On chain history", match.history));
  const others = check.matches
    .slice(1)
    .map(
      (other) =>
        `[${escapeMarkdown(other.username)}](${profileUrl(other.username)})`,
    );

  const embed = new EmbedBuilder()
    .setColor(color(total))
    .setTitle(match.username)
    .setURL(url)
    .setDescription(
      total.graded === 0
        ? `${status}. No graded picks yet, so there is no record to judge.`
        : status,
    )
    .addFields(
      { name: "Record", value: formatRecord(total), inline: true },
      { name: "Units", value: formatUnits(total.units), inline: true },
      {
        name: "ROI",
        value: total.graded > 0 ? formatRoi(total.roi) : "n/a",
        inline: true,
      },
      { name: "Graded picks", value: String(total.graded), inline: true },
      { name: "Pending", value: String(match.live.pending), inline: true },
      { name: "Last pick", value: lastPick, inline: true },
      { name: "Live vs history", value: split.join("\n") },
      { name: "Profile", value: `[View full record](${url})` },
    )
    .setFooter({ text: `${BOT_NAME} verified record` });
  if (match.avatarUrl) embed.setThumbnail(match.avatarUrl);
  if (others.length > 0)
    embed.addFields({ name: "Other matches", value: others.join(", ") });
  return embed;
}
