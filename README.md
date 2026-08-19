# Nexoria — Discord Bot (Welcome / Mod / Leveling / Roles)

## 1. Create the Discord app
1. Go to https://discord.com/developers/applications → **New Application** → name it `Nexoria`.
2. **Bot** tab → enable **Server Members Intent**, **Message Content Intent**, **Presence Intent**.
3. Copy the **Bot Token** and the **Application (Client) ID**.
4. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands` → permissions: Manage Roles, Kick, Ban, Moderate Members, Manage Messages, Send Messages, Read Message History → open the generated URL to invite it to your server.

## 2. Push to GitHub
```
git init
git add .
git commit -m "Nexoria bot"
git branch -M main
git remote add origin https://github.com/<you>/nexoria-bot.git
git push -u origin main
```
(`.env` and `bot.db` are gitignored — never commit your token.)

## 3. Deploy on Render
1. https://render.com → **New +** → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. **Environment** tab → add:
   - `DISCORD_TOKEN` = your bot token
   - `CLIENT_ID` = your application ID
4. Deploy. Render's free tier needs an open HTTP port to stay "healthy" — `index.js` already runs a tiny server on `process.env.PORT` for this.
5. Free web services sleep after ~15 min idle. To keep Nexoria online 24/7, add a free monitor at https://uptimerobot.com pinging your Render URL every 5 minutes.
6. Register slash commands once (from your own machine, using the same token/client ID):
   ```
   npm install
   npm run deploy
   ```
   (Commands only need re-registering when you add/change one — no need to rerun on every deploy.)

## Commands
- Mod: `/kick /ban /timeout /warn /warnings /purge`
- Leveling: `/rank /leaderboard /setlevelchannel`
- Welcome: `/setwelcome #channel "Welcome {user} to {server}!"`
- Roles: `/addrole /removerole`
- Reaction roles: send a message, then `/reactionrole message_id:<id> emoji:🎮 role:@Gamer`

## Data
SQLite file `bot.db` (auto-created), stores levels, warnings, settings, reaction-role maps.
