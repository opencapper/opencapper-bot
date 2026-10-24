import { verifyUrl } from "@/shared/config/branding";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  MessageFlags,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";

const PICK_REF = /^[A-Za-z0-9_-]{1,64}$/;

@Discord()
export class VerifyCommand {
  @Slash({
    name: "verify",
    description: "Link to the public proof of a pick",
  })
  async verify(
    @SlashOption({
      name: "pick",
      description: "Pick number (#42) or pick id",
      required: true,
      type: ApplicationCommandOptionType.String,
      maxLength: 65,
    })
    pick: string,
    interaction: CommandInteraction,
  ) {
    const ref = pick.trim().replace(/^#/, "");
    if (!PICK_REF.test(ref)) {
      await interaction.reply({
        content: "Give a pick number like 42 or a pick id.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    const url = verifyUrl(ref);
    await interaction.reply({
      content: `Pick ${/^\d+$/.test(ref) ? `#${ref}` : ref}: ${url}`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Verify pick")
            .setURL(url),
        ),
      ],
      allowedMentions: { parse: [] },
    });
  }
}
