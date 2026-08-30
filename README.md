# Nexoria — Discord Bot

Animated welcome & level-up cards · moderation (kick/ban/timeout/mute/warn/tempban) with full case history · AI-assisted automod · anti-raid lockdown · leveling with role rewards · tickets · reaction roles & role menus (dashboard or Discord) · suggestions with staff approval · web dashboard.

## 1. Create the Discord app
1. https://discord.com/developers/applications → **New Application** → name it `Nexoria`.
2. **Bot** tab → enable **Server Members Intent**, **Message Content Intent**, **Presence Intent**.
3. Copy the **Bot Token** and **Application (Client) ID**.
4. **OAuth2** tab → copy the **Client Secret** (needed for the web dashboard login).
5. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` → permissions: Manage Roles, Kick, Ban, Moderate Members, Manage Messages, Manage Channels, Create Private Threads, Manage Threads, Manage Guild → open the generated URL to invite it.
   - *Manage Guild* is what lets `/invites` and `/whoinvited` work — without it, invite tracking silently stays off rather than erroring.

## 2. Database (Postgres)
Render's own free Postgres **expires after 30 days and gets deleted** — use **Neon** instead (permanent free tier):
1. https://neon.tech → sign up → New Project.
2. Copy the connection string (starts with `postgresql://...?sslmode=require`) — that's your `DATABASE_URL`.

## 3. Push to GitHub
```
git init
git add .
git commit -m "Nexoria bot"
git branch -M main
git remote add origin https://github.com/<you>/nexoria-bot.git
git push -u origin main
```

## 4. Deploy on Render
1. https://render.com → **New +** → **Web Service** → connect your repo.
2. Settings: Runtime `Node`, Build Command `npm install`, Start Command `npm start`, Instance Type `Free`.
3. **Environment** tab → add:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `DATABASE_URL`
   - `DISCORD_CLIENT_SECRET` — from OAuth2 tab in the Developer Portal
   - `BASE_URL` — your Render URL once deployed, e.g. `https://nexoria-bot.onrender.com` (no trailing slash)
   - `SESSION_SECRET` — any long random string
4. Deploy. Once you have your Render URL, go back to Discord Developer Portal → OAuth2 → **Redirects** → add `<BASE_URL>/callback`, then set `BASE_URL` in Render and redeploy.
5. **Health check**: in Render's service settings, set Health Check Path to `/health` — it actually queries Postgres, not just a 200.
6. Free web services sleep after ~15 min idle. Add a free monitor at https://uptimerobot.com pinging `<BASE_URL>/health` every 5 minutes to keep Nexoria online.
7. Register slash commands once from your machine (only needed again when you add/change a command):
   ```
   npm install
   npm run deploy
   ```

## Web dashboard
Visit your `BASE_URL` → **Log in with Discord** → pick a server you manage → edit welcome/log/automod (including AI moderation)/anti-raid, manage level rewards, **create and remove reaction-role panels and role menus** (up to 3 options each — use the slash commands in Discord for up to 5), and check the stats page (member growth, message activity, top levels). Giveaways and scheduled announcements still need their slash commands.

## Commands
**Moderation**: `/kick /ban /tempban /timeout /mute /unmute /warn /warnings /setwarnexpiry /modlogs /case /purge`
**Automod**: `/automod-setup` — banned words, invite blocking, mass-mention limit, spam limit, AI-assisted toxicity detection
**Anti-raid**: `/antiraid-setup` — lock the server or auto-kick on a join spike · `/unlock`
**Logging**: `/setlogchannel` — every case (mod action, automod hit, anti-raid trigger) logs with a case ID, viewable via `/modlogs`
**DM notifications**: `/setdmnotify` — DM members on kick/ban/mute/warn/timeout (default on); ban/tempban/mute DMs include an **Appeal** button
**Appeals**: `/setappealschannel` — where appeal submissions land for staff, with Unban/Unmute/Deny buttons
**Leveling**: `/rank` (animated card) `/leaderboard /setlevelchannel /setlevelreward /levelrewards /noxp` — level-ups post an animated card automatically
**Welcome**: `/setwelcome #channel "Welcome {user} to {server}!"` (animated image banner)
**Milestones**: `/setmilestones #channel interval:100` — auto-announce every Nth member
**Birthdays**: `/setbirthday`, `/removebirthday` (per-user) · `/setbirthdaychannel` (staff) — daily auto-announcement
**Tickets**: `/setticketchannel #channel @staffrole` — posts a panel; clicking "Open Ticket" creates a private thread. `/setticketlog` sets a dedicated transcript channel (defaults to mod-log); closing a ticket posts the full message transcript there.
**Suggestions**: `/setsuggestionschannel` · `/suggest` (staff Approve/Deny via buttons, community votes via 👍/👎)
**Giveaways**: `/giveaway start` (prize, duration, winner count) · `/giveaway reroll`
**Polls**: `/poll create` (button voting with live results, or reaction voting) · `/poll close`
**Scheduled announcements**: `/schedule create` (one-time, daily, or weekly) · `/schedule list` · `/schedule cancel`
**Roles**: `/addrole /removerole /setautorole`
**Reaction roles**: `/reactionrole` (single) · `/reactionrole-panel` (full embed + up to 5 pairs) — both support `group`+`exclusive`, or use the dashboard
**Role menus**: `/rolemenu` — dropdown self-service roles, up to 5 options, or use the dashboard
**Invites**: `/invites [user]` — how many members someone's invited · `/whoinvited [user]` — who invited them
**Info**: `/serverinfo` `/userinfo` `/avatar`
**Language**: `/language` — sets replies for ping, mod actions, welcome, and level-up to en/es/fr/de (a foundation, not every command yet)
**Prefix**: `/setprefix` — every command (moderation included) becomes available as a typed command, e.g. `!kick @user spamming`. Permissions are enforced the same way as the slash version — the prefix system checks the same `default_member_permissions` each command already declares, so it's not a way around Discord's own permission gating. `!help` lists everything. Only `/setstatus` stays slash-only (owner-only global control, kept off prefix to avoid an accidental typo changing the bot's presence).
**Bot status**: `/setstatus` — **bot owner only** (needs `OWNER_ID` set), since presence is global across every server Nexoria is in, not per-server
**AI Q&A**: `/ask` (auto-fallback) `/groq` `/gemini` (force one specific provider, no fallback) — all role-gated together via `/setaskrole`, see AI features below
**AI summary**: `/summarize [messages]` — summarizes the last N messages in the channel (default 50, max 100), same role gate and providers as `/ask`
**AI @mention reply**: `/setmentionreply enabled:true` — Nexoria answers when directly @mentioned in a message, no command needed. Same role gate, 8s per-user cooldown, silent (no response) if the user lacks the role rather than a public denial
**Starboard**: `/setstarboard #channel emoji:⭐ threshold:3` — messages hitting the reaction threshold get cross-posted, star count updates live as reactions change
**Misc**: `/ping`

## AI features
Both use the same env vars (`GROQ_API_KEY` / `GEMINI_API_KEY`) — no per-server keys are stored, the bot owner sets these once in Render.
- **Moderation**: opt-in per server via `/automod-setup ai_moderation:true` or the dashboard. Flags messages that don't already match a rule-based filter. Neither key set → silently skipped, nothing gets flagged.
- **`/ask`, `/groq`, `/gemini`, `/summarize`, @mention reply**: all gated to a role via `/setaskrole` (nobody can use any of them until that's set). `/ask` and `/summarize` try Groq first and fall back to Gemini on any failure. `/groq` and `/gemini` force that specific provider with no fallback. @mention reply (`/setmentionreply`) lets Nexoria respond conversationally when tagged directly, capped to one request per user per 8 seconds. All work via prefix too once `/setprefix` is set (`!ask ...`, `!summarize`, etc. — @mention reply always works regardless of prefix, since it's triggered by the mention itself).

## Appeals flow
When `dm_notifications` is on (default), a ban/tempban/mute DM includes an **Appeal** button — even though the user is banned from the server, Discord still lets the bot DM them directly. Clicking it opens a modal asking for their reasoning; submitting posts it to the appeals channel with **Unban**/**Unmute** and **Deny** buttons for staff (requires Manage Server). No appeals channel configured → the user gets a clear "not set up yet" message instead of a silent failure.

## Notes
- **Prefix argument syntax**: options fill in left-to-right in the order they're defined for that command — check a command's `/` version in Discord to see that order. Mention users/roles/channels normally (`@user`, `@role`, `#channel`) or paste their ID. Wrap multi-word values that aren't the last option in quotes, e.g. `!poll create "Best pizza?" Pepperoni Mushroom 60`. A trailing text option (like a mod-command `reason`) automatically grabs the rest of the message, no quotes needed.
- **Case history**: every kick/ban/tempban/timeout/mute/warn/automod-hit/anti-raid action gets a case ID. `/modlogs @user` shows the full history; `/case id reason:"..."` edits a reason after the fact.
- **Warning expiry**: `/setwarnexpiry days:30` auto-expires warnings (0 = never). Expired warnings drop out of `/warnings` but stay visible in `/modlogs`.
- **Temp-bans**: `/tempban` auto-unbans on schedule — no manual follow-up needed.
- **Rate limiting**: 2s cooldown per user between slash commands, to blunt spam/abuse.
- **Scheduler**: a single 30s interval (in `utils/scheduler.js`) handles giveaway endings, scheduled messages, temp-ban expiry, warning expiry, poll endings, birthdays, and a daily stats snapshot.
- **Missing permissions**: mod commands, tickets, and anti-raid now check the bot's own permissions up front and reply with exactly what's missing, instead of failing silently or with a generic error.

## Scaling later
Not needed until ~2000+ servers, but `shard.js` is ready — switch Render's Start Command to `node shard.js` when you get there.
