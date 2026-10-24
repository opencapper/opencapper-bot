# opencapper-bot

Discord bot for OpenCapper, the verified sports picks platform. Analysts lock picks with
`/pick`, the OpenCapper API captures the odds and grades them, and `/recap` posts the
server's honest record. The bot keeps no database: every read and write goes through the API.

## Commands

| Command                                    | What it does                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `/pick sport event market selection units` | Locks a pick at the odds the API captures. `event` autocompletes upcoming games.  |
| `/recap [days]`                            | Record, units and ROI per capper in this server, sorted by units. Default 7 days. |
| `/record [user]`                           | One capper's verified record. Default yourself.                                   |
| `/leaderboard [sport] [period]`            | Top 10 cappers by ROI (30d, 90d, 1y, all). Default all sports, 30 days.           |
| `/verify pick`                             | Link to the public proof page of a pick, by number (`#42`) or id.                 |

## Results feed

Every 5 minutes the bot asks the API for picks settled in each server since the last post and
posts one result embed per pick (win, loss, push or void, units won or lost, captured vs
closing odds and CLV when known) into the first text channel whose name contains
`RESULTS_CHANNEL` (default `results`). Servers without such a channel are skipped. The
watermark per server lives in memory and in `DATA_DIR/results-watermarks.json` (default
`/app/data`, a named docker volume), so restarts do not repost. A server is first polled from
the moment the bot sees its results channel, never backfilled. A 404 from the endpoint is
treated as not deployed yet and skipped quietly.

## Run

```bash
cp .env.example .env   # fill DISCORD_BOT_TOKEN and BOT_API_TOKEN
bun install
bun dev
```

Set `DEV_GUILD_ID` to register slash commands on one server instantly instead of globally.
Set `DATA_DIR=./data` locally; the default `/app/data` only exists in the container.

## API contract

Base `OPENCAPPER_API_URL` (default `https://opencapper.coding-global.com/api`). Every request
sends `Authorization: Bearer <BOT_API_TOKEN>`. Errors return a non 2xx status with
`{ "error": "message" }`; the message is shown to the user as is. Types live in `src/lib/api.ts`.

| Method | Path                                   | Response              |
| ------ | -------------------------------------- | --------------------- |
| GET    | `/events?sport=<sportKey>`             | `ApiEvent[]`          |
| POST   | `/picks` (body `CreatePickRequest`)    | `ApiPick`             |
| GET    | `/recap?guildId=&from=&to=` (ISO 8601) | `RecapResponse`       |
| GET    | `/users/:username/stats`               | `CapperStats`         |
| GET    | `/picks/settled?guildId=&since=` (ISO) | `ApiSettledPick[]`    |
| GET    | `/leaderboard?sport=&period=&sort=roi` | `LeaderboardResponse` |

`ApiEvent` and `ApiPick` carry optional `homeImage`, `awayImage` (absolute image URLs) and
`homeCountry`, `awayCountry` (short codes such as `USA`). The pick and result embeds use the
picked side's image as thumbnail (home when the selection names no side) and show countries
next to the names.

`/picks/settled` returns picks of that guild whose `settledAt` is strictly after `since`,
oldest first, result not `pending`. `ApiSettledPick` is `ApiPick` plus `settledAt` (ISO),
`closingOdds` (American, optional) and `clv` (fraction like `roi`, optional). Odds are
American; units won on a win are `units * odds / 100` (plus odds) or `units * 100 / |odds|`.

`/leaderboard`: `sport` is a sport key and omitted for all sports, `period` is `30d`, `90d`,
`1y` or `all`. Response `{ rows, minGraded, total }`, rows `{ rank, username, picks, graded,
wins, losses, pushes, units, unitsRisked, roi, sports }` sorted by the API. A 404 shows
"The leaderboard is coming soon."

`/verify` needs no API call: it links to `WEBSITE_URL/en/verify?pick=<ref>`, where `ref` is
the pick id or its sequence number. The web page resolves both.

## Deploy

Komodo stack on the Netcup box: Komodo clones this repo and runs `docker compose build` and
`up`. Runtime env comes from the stack's `.env`. The Dockerfile builds a single Bun binary on
distroless for amd64 or arm64.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
