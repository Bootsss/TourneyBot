# Rust Tournament Signup Bot

`/tourney` collects region (US/AU), the registrant's Steam profile, and up to two
optional teammates (Discord username + Steam profile each). It assigns the
matching region role, logs everything to a Google Sheet, and invites teammates:

- **Teammates already in the server** get an automatic DM invite.
- **Teammates not in the server** — the bot cannot reach them. Discord blocks
  bots from DMing or looking up anyone who isn't already a member of a shared
  server; there's no workaround for this, it's a platform-wide restriction.
  Instead, the bot hands the registrant a ready-to-send invite message
  (with a permanent invite link) to forward themselves.

## 1. Create the Discord bot

1. Go to https://discord.com/developers/applications → **New Application**.
2. **Bot** tab → **Reset Token** → copy it → this is `DISCORD_TOKEN`.
3. Still on the Bot tab, no special Privileged Gateway Intents are needed (we don't
   read message content).
4. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Manage Roles`, `Send Messages`, `Use Slash Commands`,
     `Embed Links`
   - Open the generated URL, invite the bot to your server.
5. **General Information** tab → copy **Application ID** → this is `CLIENT_ID`.

## 2. Discord server setup

1. Create two roles: `US Competitor` and `AU Competitor`.
2. **Server Settings → Roles**: drag the bot's own role **above** both of those
   roles in the list. If it's below, role assignment will silently fail — this
   is the #1 cause of "the bot isn't giving out roles" bugs.
3. Right-click each role (with Developer Mode on, User Settings → Advanced →
   Developer Mode) → **Copy Role ID** → these are `US_ROLE_ID` / `AU_ROLE_ID`.
4. Create (or pick) the channel where signups should happen, e.g.
   `#tourney-signup`. Right-click it → **Copy Channel ID** → `SIGNUP_CHANNEL_ID`.
5. Right-click your server icon → **Copy Server ID** → `GUILD_ID`.
6. Pick a public channel (e.g. your signup channel) → right-click → **Invite People**
   → click the settings/gear icon on the invite dialog → set **Expire After** to
   `Never` and **Max Number of Uses** to `No limit` → copy the link. This is
   `INVITE_LINK`, used in the message sent to teammates.

## 3. Google Sheet + webhook

1. Create a new Google Sheet (name it whatever you like).
2. Follow the instructions at the top of `google-apps-script.gs` — paste the
   code into the Sheet's Apps Script editor, set your own `SECRET`, deploy as
   a web app, copy the deployment URL. That URL is `SHEETS_WEBHOOK_URL`, and
   the secret you chose is `SHEETS_SECRET`.
3. The script auto-creates a `Signups` tab with headers on first submission —
   you don't need to set up columns yourself. **If you already have a `Signups`
   tab from an earlier version of this bot**, delete it (right-click the tab →
   Delete) so it regenerates with the new teammate columns — otherwise old
   rows will be missing them.

## 4. Configure and run locally (to test)

```bash
cp .env.example .env
# fill in all the values from steps 1-3
npm install
npm run deploy-commands   # registers /tourney — run again if you edit the command
npm start
```

Test in Discord: run `/tourney` in the signup channel, fill in a Steam URL,
click a region button, confirm the role appears and a row lands in the Sheet.

## 5. Deploy to Railway (24/7 hosting)

1. Push this folder to a GitHub repo (or use `railway up` from the CLI directly).
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
3. In the Railway project's **Variables** tab, add every value from your `.env`
   file (do NOT commit `.env` to git — `.gitignore` already excludes it).
4. Railway auto-detects Node and runs `npm start`. Since this bot doesn't serve
   HTTP, no extra config is needed — it just needs to be a standard service,
   not a "web service" with a health-check port.
5. After the first deploy, run `npm run deploy-commands` once, either locally
   (pointed at the same `.env` values) or via Railway's shell — this registers
   the slash command with Discord; it only needs to be done once (or again
   whenever you change the command definition).

## Admin: resetting a competitor

`/tourney-reset @user` removes whichever region role they have, so they can run
`/tourney` again. It's hidden from regular members by default (requires the
**Manage Roles** permission) — a server owner can loosen or tighten that further
under **Server Settings → Integrations → [bot name]**.

This does **not** remove their existing row from the Google Sheet — if they
re-register, you'll end up with two rows for them (old region + new region).
For a small tournament that's usually fine to eyeball and delete manually; if
duplicate rows become a real problem, the fix is having the Apps Script
overwrite an existing row for that Discord ID instead of always appending —
not included here since it adds complexity most tournaments won't need.

## Known limitations (intentional, not bugs)

- **In-memory pending state**: the Steam URL is held in memory for up to 10
  minutes between the modal and the region button. If the bot restarts in
  that window, the user just re-runs `/tourney`. Not worth a database for a
  tournament signup flow.
- **Free-text Steam URL**: validated by format, not verified against Steam's
  API. If you want to confirm the profile actually exists, that's a small
  follow-up (Steam Web API `ISteamUser/GetPlayerSummaries`) — not included
  here to keep the initial setup simple.
