require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const moderation = require('./commands/moderation');
const leveling = require('./commands/leveling');
const config = require('./commands/config');
const guildMemberAdd = require('./events/guildMemberAdd');
const messageCreate = require('./events/messageCreate');
const reactionRoles = require('./events/reactionRoles');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
for (const cmd of [...moderation, ...leveling, ...config]) client.commands.set(cmd.data.name, cmd);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Brand as Nexoria (rename + avatar) — only needs to run once successfully,
  // Discord rate-limits username changes so failures here are safe to ignore.
  try {
    if (client.user.username !== 'Nexoria') await client.user.setUsername('Nexoria');
    const logoPath = path.join(__dirname, 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) await client.user.setAvatar(logoPath);
  } catch (err) {
    console.warn('⚠️ Could not update bot name/avatar (rate-limited or already set):', err.message);
  }
});

// Render's free web service tier requires an open HTTP port — this also
// gives you a URL to ping with UptimeRobot so the service doesn't sleep.
const server = http.createServer((_, res) => res.end('Nexoria is online.'));
server.listen(process.env.PORT || 3000);

client.on('guildMemberAdd', guildMemberAdd);
client.on('messageCreate', messageCreate);
client.on('messageReactionAdd', (reaction, user) => reactionRoles.add(reaction, user));
client.on('messageReactionRemove', (reaction, user) => reactionRoles.remove(reaction, user));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const reply = { content: '❌ Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
});

client.login(process.env.DISCORD_TOKEN);
