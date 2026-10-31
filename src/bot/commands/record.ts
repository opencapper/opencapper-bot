import { noProfileEmbed, recordEmbed } from "@/core/embeds/record.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { findCapperByDiscordId } from "@/lib/api";
import {
  ApplicationCommandOptionType,
  CommandInteraction,
  GuildMember,
  InteractionContextType,
  User,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

@Discord()
export class RecordCommand {
  @Slash({
    name: "record",
    description: "Show a capper's verified record",
    contexts: [InteractionContextType.Guild],
  })
  async record(
    @SlashOption({
      name: "user",
      description: "Capper to look up (default you)",
      required: false,
      type: ApplicationCommandOptionType.User,
    }) // discordx resolves a user option to the GuildMember when there is one, which has no username.
    target: User | GuildMember | undefined,
    interaction: CommandInteraction,
  ) {
    const discordId = target?.id ?? interaction.user.id;
    if (!(await safeDeferReply(interaction))) return;
    try {
      const match = await findCapperByDiscordId(discordId);
      await safeEditReply(interaction, {
        embeds: [
          match ? recordEmbed(match) : noProfileEmbed(`<@${discordId}>`),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
