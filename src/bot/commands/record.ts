import { recordEmbed } from "@/core/embeds/record.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { api } from "@/lib/api";
import {
  ApplicationCommandOptionType,
  CommandInteraction,
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
    })
    target: User | undefined,
    interaction: CommandInteraction,
  ) {
    const user = target ?? interaction.user;
    if (!(await safeDeferReply(interaction))) return;
    try {
      const stats = await api.userStats(user.username);
      await safeEditReply(interaction, { embeds: [recordEmbed(stats)] });
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
