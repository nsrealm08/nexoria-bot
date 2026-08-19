# Nexoria — Discord Bot

Welcome messages · moderation (kick/ban/timeout/mute/warn) · automod · leveling with rank cards & role rewards · role management · reaction roles & role menus.

## 1. Create the Discord app
1. https://discord.com/developers/applications → **New Application** → name it `Nexoria`.
2. **Bot** tab → enable **Server Members Intent**, **Message Content Intent**, **Presence Intent**.
3. Copy the **Bot Token** and **Application (Client) ID**.
4. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` → permissions: Manage Roles, Kick, Ban, Moderate Members, Manage Messages → open the generated URL to invite it.

## 2. Database (Postgres)
Render's own free Postgres **expires after 30 days and gets deleted** — not worth using for a bot. Use **Neon** instead (permanent free tier):
1. https://neon.tech → sign up → New Project.
2. Copy the connection string it gives you (starts with `postgresql://...?sslmode=require`).
3. That's your `DATABASE_URL`.

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
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `DATABASE_URL` (from Neon)
4. Deploy. `index.js` runs a tiny HTTP server on `process.env.PORT` so Render's health check passes.
5. Free web services sleep after ~15 min idle. Add a free monitor at https://uptimerobot.com pinging your Render URL every 5 minutes to keep Nexoria online.
6. Register slash commands once from your machine (only needed again if you add/change a command):
   ```
   npm install
   npm run deploy
   ```

## Commands
**Moderation**: `/kick /ban /timeout /mute /unmute /warn /warnings /purge`
**Automod**: `/automod-setup` — banned words, invite blocking, mass-mention limit, spam limit (auto-deletes + logs)
**Logging**: `/setlogchannel` — posts every mod action + errors as case embeds
**Leveling**: `/rank` (image card) `/leaderboard /setlevelchannel /setlevelreward /levelrewards /noxp`
**Welcome**: `/setwelcome #channel "Welcome {user} to {server}!"`
**Roles**: `/addrole /removerole`
**Reaction roles**: `/reactionrole` (single, on an existing message) · `/reactionrole-panel` (posts a full embed + up to 5 emoji/role pairs in one go) — both support `group` + `exclusive` for pick-one-of-many sets
**Role menus**: `/rolemenu` — dropdown-based self-service roles, up to 5 options, optional exclusive mode
**Misc**: `/ping`

## Scaling later
Not needed until ~2000+ servers, but `shard.js` is ready — switch Render's Start Command to `node shard.js` (or `npm run start:sharded`) when you get there.
