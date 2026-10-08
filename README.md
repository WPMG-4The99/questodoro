# Questodoro

One-screen gamified Pomodoro. Work earns the rank. Yesterday-you is the only opponent. Oorah.

Built for Hackyard Yard #3 (theme: **One Screen**). No routes, no tabs, no second page.

**Repo:** [github.com/wyldephyre/questodoro](https://github.com/wyldephyre/questodoro)

## What it does

- 25 / 5 timer on the board (change work and break lengths in place)
- Start, Pause, Reset on the same screen
- Finish a **work** block → XP, level, daily streak, personal high score. Rest starts on the work clock.
- Missions are **on demand** and independent of the work clock. Each has its own Start / Pause / Complete. Live mission rings sit inside the work clock (max 3).
- Side XP scales with mission length (2–20, about 1 per 5 seconds), capped at 100 side XP per day. Work XP is not eaten by that cap.
- **Yesterday you**: a local daily rollup. Today total XP vs yesterday, the delta, and one line.
  - Ahead: Beating yesterday. Hold the line.
  - Behind: Yesterday's still winning. Catch up.
  - Tie, or no yesterday yet: First blood today. Make it count.
- **Bribe shelf**: type a reward, pick an unlock rule (level, day streak, or check-ins in a row), stamp CLAIMED yourself.
- Everything stays in `localStorage`. Offline works. No accounts.

Yesterday is the previous calendar day only. Skip a day and there is no opponent.

## Rules (also printed on the board)

| Rule | How it counts |
| --- | --- |
| Work XP | 4 XP per minute of the finished work block (minimum 4) |
| Side XP | Scaled from the mission length (2–20). Ceiling 100 side XP per day |
| Level | `1 + floor(total XP / 200)` |
| Day streak | Consecutive local days with at least one finished work block |
| Mission streak | Consecutive check-ins in a row (skip resets it) |
| High score | Most XP earned in a **single day** (work + side) |
| Yesterday you | `dateKey`, work XP, side XP, total XP, work blocks finished, focus minutes. Focus minutes come from finished work blocks only. |

## Demo (stranger, one screen)

1. Open the live URL.
2. Hit **Drill 15s** (optional — 15s work / 20s break).
3. **Start**. When the work block ends, Today XP climbs. Level, streak, and high score update.
4. Start up to three side missions. Their clocks stay separate from the work ring.
5. Edit missions and bribes on the board. They survive refresh.
6. After midnight, yesterday becomes the prior day and today starts at 0.

## Run locally

```bash
npm install
npm run dev
```

Dev server: `http://localhost:8080`.

## Nona

Questodoro reads remote config from Nona.
The request is `GET /api/environments/Production/parameters`.
The header is `X-Api-Key`.
The environment name is `Production`.

Set these in `.env.local`:

```bash
VITE_NONA_URL=http://127.0.0.1:18080
VITE_NONA_KEY=
```

Use a client-scope key.
That key can read `client` entries and `all` entries.
That key cannot read `server` entries.
Put the secret in `.env.local`.
Do not commit the secret.

Create each parameter with scope `client`:

| Key | Type | Default |
| --- | --- | --- |
| `Limits:MaxLiveMissions` | number | `3` |
| `Limits:SideXpDailyCap` | number | `100` |
| `Limits:XpScale` | json | `{"min":2,"max":20}` |
| `Features:RezSick` | boolean | `true` |
| `App:Banner` | text | empty string |

An empty URL keeps these defaults.
An empty key keeps these defaults.
A down, slow, or bad Nona response keeps these defaults.
The first paint does not wait for Nona.
The app reads again every 30 seconds.
The app also reads when the tab gains focus.

This Nona build allows every browser origin.
A preflight returns `Access-Control-Allow-Origin` for the caller.
It also returns `Access-Control-Allow-Headers: X-Api-Key`.
No extra CORS setting is required on this image.
The policy name is `AllowAllOrigins` in `core/src/WebApi/Program.cs`.

```bash
npm run build
npm run typecheck
```

## Deploy

Vercel (TanStack Start / Vite). No database. The board is local to the device.

## Leftover

- Break check-in and skip still exist in the store. They are not on the board and do not gate the work clock.
- Desktop-first at 1920x1080. A phone crop scrolls.
- Side-mission timers are session-only. A refresh clears a live run.
- The same side mission can be completed again until the 100 XP daily cap.
- A skipped calendar day is not an opponent. Yesterday means the prior local day, not the last day you played.

## Out of scope

Accounts, shared boards, extra pages, native apps, voice, stickers, calendars.
