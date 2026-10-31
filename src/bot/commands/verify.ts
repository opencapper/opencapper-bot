import {
  replyEphemeral,
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { findCapperByDiscordId } from "@/lib/api";
import {
  BOT_NAME,
  verifySequenceUrl,
  verifyUrl,
} from "@/shared/config/branding";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  GuildMember,
  User,
  escapeMarkdown,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

const PICK_ID = /^[1-9][0-9]{0,8}$/;
const PICK_NUMBER = /^#([1-9][0-9]{0,8})$/;

function verifyReply(content: string, url: string) {
  return {
    content: `${content}: ${url}`,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Verify pick")
          .setURL(url),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

@Discord()
export class VerifyCommand {
  @Slash({
    name: "verify",
    description: "Link to the public proof of a pick",
  })
  async verify(
    @SlashOption({
      name: "pick",
      description: "Pick id (123), or a capper's pick number (#9) with user",
      required: true,
      type: ApplicationCommandOptionType.String,
      maxLength: 10,
    })
    pick: string,
    @SlashOption({
      name: "user",
      description: "Capper whose pick number you gave (default you)",
      required: false,
      type: ApplicationCommandOptionType.User,
    })
    target: User | GuildMember | undefined,
    interaction: CommandInteraction,
  ) {
    const ref = pick.trim();
    const numbered =
      PICK_NUMBER.exec(ref) ?? (target ? PICK_NUMBER.exec(`#${ref}`) : null);
    if (!numbered) {
      if (!PICK_ID.test(ref)) {
        await replyEphemeral(
          interaction,
          "Give a pick id like 123, or a pick number like #9 with the capper as user.",
        );
        return;
      }
      await interaction.reply(verifyReply(`Pick id ${ref}`, verifyUrl(ref)));
      return;
    }

    // "#9" is per capper numbering, so it needs the capper's username, not the global id.
    const discordId = target?.id ?? interaction.user.id;
    const sequence = Number(numbered[1]);
    if (!(await safeDeferReply(interaction))) return;
    try {
      const match = await findCapperByDiscordId(discordId);
      if (!match) {
        await safeEditReply(interaction, {
          content: `<@${discordId}> has no picks on ${BOT_NAME}.`,
          allowedMentions: { parse: [] },
        });
        return;
      }
      await safeEditReply(
        interaction,
        verifyReply(
          `Pick #${sequence} of ${escapeMarkdown(match.username)}`,
          verifySequenceUrl(match.username, sequence),
        ),
      );
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
