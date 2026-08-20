# Nexoria — Discord Bot

Welcome image cards · moderation (kick/ban/timeout/mute/warn) · automod · anti-raid lockdown · leveling with rank cards & role rewards · role management · reaction roles & role menus · suggestions with staff approval · web dashboard.

## 1. Create the Discord app
1. https://discord.com/developers/applications → **New Application** → name it `Nexoria`.
2. **Bot** tab → enable **Server Members Intent**, **Message Content Intent**, **Presence Intent**.
3. Copy the **Bot Token** and **Application (Client) ID**.
4. **OAuth2** tab → copy the **Client Secret** (needed for the web dashboard login).
5. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` → permissions: Manage Roles, Kick, Ban, Moderate Members, Manage Messages, Manage Channels → open the generated URL to invite it.

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
Visit your `BASE_URL` → **Log in with Discord** → pick a server you manage → edit welcome/log/automod/anti-raid, manage level rewards, view/remove reaction roles, and check the stats page (member growth, message activity, top levels) without touching slash commands. New reaction roles, role menus, giveaways, and scheduled announcements still need their slash commands since they post live Discord messages.

## Commands
**Moderation**: `/kick /ban /tempban /timeout /mute /unmute /warn /warnings /setwarnexpiry /modlogs /case /purge`
**Automod**: `/automod-setup` — banned words, invite blocking, mass-mention limit, spam limit
**Anti-raid**: `/antiraid-setup` — lock the server or auto-kick on a join spike · `/unlock`
**Logging**: `/setlogchannel` — every case (mod action, automod hit, anti-raid trigger) logs with a case ID, viewable via `/modlogs`
**Leveling**: `/rank` (image card) `/leaderboard /setlevelchannel /setlevelreward /levelrewards /noxp`
**Welcome**: `/setwelcome #channel "Welcome {user} to {server}!"` (generated image banner)
**Suggestions**: `/setsuggestionschannel` · `/suggest` (staff Approve/Deny via buttons, community votes via 👍/👎)
**Giveaways**: `/giveaway start` (prize, duration, winner count) · `/giveaway reroll`
**Scheduled announcements**: `/schedule create` (one-time, daily, or weekly) · `/schedule list` · `/schedule cancel`
**Roles**: `/addrole /removerole`
**Reaction roles**: `/reactionrole` (single) · `/reactionrole-panel` (full embed + up to 5 pairs) — both support `group`+`exclusive`
**Role menus**: `/rolemenu` — dropdown self-service roles, up to 5 options
**Language**: `/language` — sets replies for ping, mod actions, welcome, and level-up to en/es/fr/de (a foundation, not every command yet)
**Misc**: `/ping`

## Notes
- **Case history**: every kick/ban/tempban/timeout/mute/warn/automod-hit/anti-raid action gets a case ID. `/modlogs @user` shows the full history; `/case id reason:"..."` edits a reason after the fact.
- **Warning expiry**: `/setwarnexpiry days:30` auto-expires warnings (0 = never). Expired warnings drop out of `/warnings` but stay visible in `/modlogs`.
- **Temp-bans**: `/tempban` auto-unbans on schedule — no manual follow-up needed.
- **Rate limiting**: 2s cooldown per user between slash commands, to blunt spam/abuse.
- **Scheduler**: a single 30s interval (in `utils/scheduler.js`) handles giveaway endings, scheduled messages, temp-ban expiry, warning expiry, and a daily stats snapshot.

## Scaling later
Not needed until ~2000+ servers, but `shard.js` is ready — switch Render's Start Command to `node shard.js` when you get there.
