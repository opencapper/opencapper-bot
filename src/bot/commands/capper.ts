import { capperEmbed, noRecordEmbed } from "@/core/embeds/capper.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { api } from "@/lib/api";
import { checkUrl } from "@/shared/config/branding";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  GuildMember,
  MessageFlags,
  User,
  escapeMarkdown,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

const NAME_MAX = 200;

function linkRow(label: string, url: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url),
  );
}

@Discord()
export class CapperCommand {
  @Slash({
    name: "capper",
    description: "Check if a capper has a verified record",
  })
  async capper(
    @SlashOption({
      name: "user",
      description: "Discord user to check",
      required: false,
      type: ApplicationCommandOptionType.User,
    })
    user: User | GuildMember | undefined,
    @SlashOption({
      name: "name",
      description:
        "OpenCapper, Discord, Telegram or Polymarket name, or a Discord ID",
      required: false,
      type: ApplicationCommandOptionType.String,
      maxLength: NAME_MAX,
    })
    name: string | undefined,
    interaction: CommandInteraction,
  ) {
    const query = name?.trim() ?? "";
    if (!user && !query) {
      await interaction.reply({
        content: "Give a Discord user or a name to check.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    if (!(await safeDeferReply(interaction))) return;
    try {
      // A mention resolves by Discord id only: a same named account elsewhere is exactly what impersonators use.
      const check = user
        ? await api.checkDiscord(user.id)
        : await api.check(query);
      const subject = user ? `<@${user.id}>` : `**${escapeMarkdown(query)}**`;
      const found = check.matches.length > 0;
      await safeEditReply(interaction, {
        embeds: [found ? capperEmbed(check) : noRecordEmbed(subject)],
        components: found
          ? []
          : [linkRow("Check on the website", checkUrl(user ? user.id : query))],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
