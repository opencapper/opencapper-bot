import { pickEmbed } from "@/core/embeds/pick.embed";
import {
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import { api, type ApiEvent } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  MARKETS,
  SPORTS,
  isMarket,
  isSportKey,
  type SportKey,
} from "@/shared/config/sports";
import {
  ApplicationCommandOptionType,
  type AutocompleteInteraction,
  CommandInteraction,
  InteractionContextType,
  MessageFlags,
} from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";

const EVENTS_TTL_MS = 60_000;
const eventsCache = new Map<SportKey, { at: number; events: ApiEvent[] }>();

// Autocomplete must answer within 3s, so keystrokes reuse one fetch per sport.
async function cachedEvents(sport: SportKey): Promise<ApiEvent[]> {
  const hit = eventsCache.get(sport);
  if (hit && Date.now() - hit.at < EVENTS_TTL_MS) return hit.events;
  const events = await api.events(sport);
  eventsCache.set(sport, { at: Date.now(), events });
  return events;
}

function eventLabel(e: ApiEvent): string {
  const when = new Date(e.commenceTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
  return `${e.away} @ ${e.home}, ${when} UTC`.slice(0, 100);
}

async function autocompleteEvent(interaction: AutocompleteInteraction) {
  const sport = interaction.options.getString("sport");
  if (!isSportKey(sport)) {
    await interaction.respond([]).catch(() => {});
    return;
  }
  const query = interaction.options.getFocused().toLowerCase();
  const events = await cachedEvents(sport).catch((err) => {
    logger.warn("Event autocomplete failed", { sport, error: String(err) });
    return [];
  });
  const now = Date.now();
  const choices = events
    .filter((e) => new Date(e.commenceTime).getTime() > now)
    .filter((e) => `${e.home} ${e.away}`.toLowerCase().includes(query))
    .slice(0, 25)
    .map((e) => ({ name: eventLabel(e), value: e.id }));
  await interaction.respond(choices).catch(() => {});
}

@Discord()
export class PickCommand {
  @Slash({
    name: "pick",
    description: "Lock a pick at the current market odds",
    contexts: [InteractionContextType.Guild],
  })
  async pick(
    @SlashChoice(...SPORTS)
    @SlashOption({
      name: "sport",
      description: "Sport",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    sport: string,
    @SlashOption({
      name: "event",
      description: "Upcoming event",
      required: true,
      type: ApplicationCommandOptionType.String,
      autocomplete: autocompleteEvent,
    })
    eventId: string,
    @SlashChoice(...MARKETS)
    @SlashOption({
      name: "market",
      description: "Market",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    market: string,
    @SlashOption({
      name: "selection",
      description:
        "Team or side, with the line for spreads and totals (Chiefs +3.5, Over 47.5)",
      required: true,
      type: ApplicationCommandOptionType.String,
      maxLength: 100,
    })
    selection: string,
    @SlashOption({
      name: "units",
      description: "Stake in units (0.5 to 5)",
      required: true,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.5,
      maxValue: 5,
    })
    units: number,
    interaction: CommandInteraction,
  ) {
    if (!interaction.guildId || !isSportKey(sport) || !isMarket(market)) {
      await interaction.reply({
        content: "Invalid pick. Choose a sport and market from the list.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    if (!(await safeDeferReply(interaction))) return;
    try {
      const pick = await api.createPick({
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        guildId: interaction.guildId,
        sportKey: sport,
        eventId,
        market,
        selection: selection.trim(),
        units,
      });
      await safeEditReply(interaction, { embeds: [pickEmbed(pick)] });
    } catch (err) {
      await replyFailure(interaction, err);
    }
  }
}
