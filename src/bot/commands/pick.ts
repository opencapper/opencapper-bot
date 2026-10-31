import { pickEmbed } from "@/core/embeds/pick.embed";
import {
  replyEphemeral,
  replyFailure,
  safeDeferReply,
  safeEditReply,
} from "@/core/utils/command.utils";
import {
  eventLabel,
  isUpcoming,
  resolveEvent,
  searchEvents,
} from "@/core/utils/event.utils";
import { api, type ApiEvent } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  MARKETS,
  SPORTS,
  isMarket,
  isSportKey,
  sportLabel,
  type SportKey,
} from "@/shared/config/sports";
import { UNITS, UNITS_HINT, isValidUnits } from "@/shared/config/units";
import {
  ApplicationCommandOptionType,
  type AutocompleteInteraction,
  CommandInteraction,
  InteractionContextType,
  escapeMarkdown,
} from "discord.js";
import { Discord, Slash, SlashChoice, SlashOption } from "discordx";

const EVENTS_TTL_MS = 60_000;
// Leaves room inside Discord's 3 second autocomplete window.
const EVENTS_TIMEOUT_MS = 2_000;
const PICK_COOLDOWN_MS = 15_000;
const EVENT_ID = /^[A-Za-z0-9]{8,64}$/;
// Values of the informational autocomplete rows; never valid event ids.
const NO_EVENT = "_none";
const EVENTS_DOWN = "_unavailable";

const eventsCache = new Map<SportKey, { at: number; events: ApiEvent[] }>();
const eventsInflight = new Map<SportKey, Promise<ApiEvent[]>>();
const lastPickAt = new Map<string, number>();

// Keystrokes share one fetch per sport; a failed refresh serves the last list, null when there is none.
async function cachedEvents(sport: SportKey): Promise<ApiEvent[] | null> {
  const hit = eventsCache.get(sport);
  if (hit && Date.now() - hit.at < EVENTS_TTL_MS) return hit.events;
  let pending = eventsInflight.get(sport);
  if (!pending) {
    pending = api
      .events(sport, EVENTS_TIMEOUT_MS)
      .then((events) => {
        eventsCache.set(sport, { at: Date.now(), events });
        return events;
      })
      .finally(() => eventsInflight.delete(sport));
    eventsInflight.set(sport, pending);
  }
  try {
    return await pending;
  } catch (err) {
    logger.warn("Events fetch failed", { sport, error: String(err) });
    return hit?.events ?? null;
  }
}

function infoChoice(name: string, value: string) {
  return [{ name: name.slice(0, 100), value }];
}

async function autocompleteEvent(interaction: AutocompleteInteraction) {
  const sport = interaction.options.getString("sport");
  if (!isSportKey(sport)) {
    await interaction
      .respond(infoChoice("Choose a sport first", NO_EVENT))
      .catch(() => {});
    return;
  }
  const query = interaction.options.getFocused().trim();
  const events = await cachedEvents(sport);
  if (!events) {
    await interaction
      .respond(
        infoChoice(
          "Events are unavailable right now, try again in a moment",
          EVENTS_DOWN,
        ),
      )
      .catch(() => {});
    return;
  }
  const matches = searchEvents(events, query);
  const choices = matches.length
    ? matches.slice(0, 25).map((e) => ({ name: eventLabel(e), value: e.id }))
    : infoChoice(
        query
          ? `No upcoming ${sportLabel(sport)} event matches "${query}"`
          : `No upcoming ${sportLabel(sport)} events right now`,
        NO_EVENT,
      );
  await interaction.respond(choices).catch(() => {});
}

// Returns the event id to send, or a message for the user. Runs before deferring so failures stay private.
async function eventIdFor(
  sport: SportKey,
  input: string,
): Promise<{ eventId: string } | { message: string }> {
  const value = input.trim();
  if (value === EVENTS_DOWN) {
    return { message: "Events are unavailable right now. Try again soon." };
  }
  const events = value === NO_EVENT ? [] : await cachedEvents(sport);
  if (!events) {
    if (EVENT_ID.test(value)) return { eventId: value };
    return { message: "Events are unavailable right now. Try again soon." };
  }
  const resolved = resolveEvent(events, value);
  if (resolved.kind === "found") {
    if (!isUpcoming(resolved.event)) {
      return { message: "This event has already started." };
    }
    return { eventId: resolved.event.id };
  }
  if (resolved.kind === "ambiguous") {
    const list = resolved.candidates.map((e) => `> ${eventLabel(e)}`);
    return {
      message: `Several ${sportLabel(sport)} events match "${escapeMarkdown(value)}":\n${list.join("\n")}\nType more of the team names or choose one from the list.`,
    };
  }
  return {
    message:
      value === NO_EVENT || !value
        ? `Choose an upcoming ${sportLabel(sport)} event from the list.`
        : `No upcoming ${sportLabel(sport)} event matches "${escapeMarkdown(value)}". Start typing a team and choose an event from the list.`,
  };
}

// First line against spam; the API also limits picks per user.
function cooldownLeft(userId: string): number {
  const last = lastPickAt.get(userId);
  return last === undefined ? 0 : last + PICK_COOLDOWN_MS - Date.now();
}

function startCooldown(userId: string): void {
  const now = Date.now();
  for (const [id, at] of lastPickAt) {
    if (now - at >= PICK_COOLDOWN_MS) lastPickAt.delete(id);
  }
  lastPickAt.set(userId, now);
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
      description: "Upcoming event, type any team name",
      required: true,
      type: ApplicationCommandOptionType.String,
      autocomplete: autocompleteEvent,
    })
    event: string,
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
        "Team or side, with the line for spreads and totals (Chiefs +3.5, Over 47.5, Draw)",
      required: true,
      type: ApplicationCommandOptionType.String,
      maxLength: 100,
    })
    selection: string,
    @SlashOption({
      name: "units",
      description: `Stake in units (${UNITS.min} to ${UNITS.max}, steps of ${UNITS.step})`,
      required: true,
      type: ApplicationCommandOptionType.Number,
      minValue: UNITS.min,
      maxValue: UNITS.max,
    })
    units: number,
    interaction: CommandInteraction,
  ) {
    const guildId = interaction.guildId;
    if (!guildId || !isSportKey(sport) || !isMarket(market)) {
      await replyEphemeral(
        interaction,
        "Invalid pick. Choose a sport and market from the list.",
      );
      return;
    }
    if (!isValidUnits(units)) {
      await replyEphemeral(interaction, UNITS_HINT);
      return;
    }
    const wait = cooldownLeft(interaction.user.id);
    if (wait > 0) {
      await replyEphemeral(
        interaction,
        `Slow down: you can lock another pick in ${Math.ceil(wait / 1000)} seconds.`,
      );
      return;
    }
    const target = await eventIdFor(sport, event);
    if ("message" in target) {
      await replyEphemeral(interaction, target.message);
      return;
    }

    startCooldown(interaction.user.id);
    if (!(await safeDeferReply(interaction))) return;
    try {
      const pick = await api.createPick({
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        guildId,
        sportKey: sport,
        eventId: target.eventId,
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
