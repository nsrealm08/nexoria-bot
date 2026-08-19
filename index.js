require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const { init: initDb, pool } = require('./database');

const moderation = require('./commands/moderation');
const leveling = require('./commands/leveling');
const config = require('./commands/config');
const automod = require('./commands/automod');
const misc = require('./commands/misc');

const guildMemberAdd = require('./events/guildMemberAdd');
const messageCreate = require('./events/messageCreate');
const reactionRoles = require('./events/reactionRoles');
const roleMenu = require('./events/roleMenu');

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
for (const cmd of [...moderation, ...leveling, ...config, ...automod, ...misc]) client.commands.set(cmd.data.name, cmd);

async function logError(guild, err, context) {
  console.error(`[${context}]`, err);
  if (!guild) return;
  try {
    const { rows } = await pool.query('SELECT log_channel FROM settings WHERE guild_id=$1', [guild.id]);
    const channel = rows[0]?.log_channel ? guild.channels.cache.get(rows[0].log_channel) : null;
    if (channel) {
      await channel.send({ embeds: [new EmbedBuilder().setColor('DarkRed')
        .setTitle('⚠️ Error').setDescription(`Context: \`${context}\`\n\`\`\`${String(err).slice(0, 1000)}\`\`\``)] });
    }
  } catch { /* avoid recursive failure */ }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    if (client.user.username !== 'Nexoria') await client.user.setUsername('Nexoria');
    const logoPath = path.join(__dirname, 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) await client.user.setAvatar(logoPath);
  } catch (err) {
    console.warn('⚠️ Could not update bot name/avatar (rate-limited or already set):', err.message);
  }
});

client.on('guildMemberAdd', (m) => guildMemberAdd(m).catch(err => logError(m.guild, err, 'guildMemberAdd')));
client.on('messageCreate', (m) => messageCreate(m).catch(err => logError(m.guild, err, 'messageCreate')));
client.on('messageReactionAdd', (r, u) => reactionRoles.add(r, u).catch(err => logError(r.message.guild, err, 'reactionAdd')));
client.on('messageReactionRemove', (r, u) => reactionRoles.remove(r, u).catch(err => logError(r.message.guild, err, 'reactionRemove')));

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await roleMenu(interaction);
    }
  } catch (err) {
    await logError(interaction.guild, err, `interaction:${interaction.commandName || interaction.customId}`);
    const reply = { content: '❌ Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

// Render's free web service tier requires an open HTTP port — also gives
// you a URL to ping with UptimeRobot so the service doesn't sleep.
const server = http.createServer((_, res) => res.end('Nexoria is online.'));
server.listen(process.env.PORT || 3000);

(async () => {
  await initDb();
  await client.login(process.env.DISCORD_TOKEN);
})();
