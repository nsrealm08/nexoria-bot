require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const { init: initDb, pool, healthCheck } = require('./database');
const { buildDashboard } = require('./web/dashboard');

const moderation = require('./commands/moderation');
const leveling = require('./commands/leveling');
const config = require('./commands/config');
const automod = require('./commands/automod');
const misc = require('./commands/misc');
const antiraid = require('./commands/antiraid');
const suggestions = require('./commands/suggestions');
const giveaway = require('./commands/giveaway');
const schedule = require('./commands/schedule');
const language = require('./commands/language');
const tickets = require('./commands/tickets');
const info = require('./commands/info');
const { startScheduler } = require('./utils/scheduler');
const { getLang, t } = require('./utils/i18n');

const guildMemberAdd = require('./events/guildMemberAdd');
const messageCreate = require('./events/messageCreate');
const reactionRoles = require('./events/reactionRoles');
const roleMenu = require('./events/roleMenu');
const suggestionReview = require('./events/suggestionReview');
const ticketHandler = require('./events/ticketHandler');

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
for (const cmd of [...moderation, ...leveling, ...config, ...automod, ...misc, ...antiraid, ...suggestions, ...giveaway, ...schedule, ...language, ...tickets, ...info]) {
  client.commands.set(cmd.data.name, cmd);
}

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

// Graceful reconnect handling — discord.js retries the gateway connection
// automatically; these just make sure drops are visible instead of silent.
client.on('error', (err) => console.error('⚠️ Client error (reconnecting):', err.message));
client.on('shardError', (err, id) => console.error(`⚠️ Shard ${id} error (reconnecting):`, err.message));
client.on('shardDisconnect', (event, id) => console.warn(`⚠️ Shard ${id} disconnected (code ${event.code}), attempting reconnect...`));
client.on('shardReconnecting', (id) => console.log(`🔄 Shard ${id} reconnecting...`));
client.on('shardResume', (id) => console.log(`✅ Shard ${id} resumed.`));
process.on('unhandledRejection', (err) => console.error('⚠️ Unhandled rejection (continuing):', err));

client.on('guildMemberAdd', (m) => guildMemberAdd(m).catch(err => logError(m.guild, err, 'guildMemberAdd')));
client.on('messageCreate', (m) => messageCreate(m).catch(err => logError(m.guild, err, 'messageCreate')));
client.on('messageReactionAdd', (r, u) => reactionRoles.add(r, u).catch(err => logError(r.message.guild, err, 'reactionAdd')));
client.on('messageReactionRemove', (r, u) => reactionRoles.remove(r, u).catch(err => logError(r.message.guild, err, 'reactionRemove')));

const commandCooldowns = new Map(); // userId -> last command timestamp
const COOLDOWN_MS = 2000;

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const last = commandCooldowns.get(interaction.user.id) || 0;
      const now = Date.now();
      if (now - last < COOLDOWN_MS) {
        const lang = interaction.guild ? await getLang(interaction.guild.id) : 'en';
        return interaction.reply({ content: t(lang, 'rateLimited'), ephemeral: true }).catch(() => {});
      }
      commandCooldowns.set(interaction.user.id, now);

      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await roleMenu(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('nexoria-open-ticket') || interaction.customId.startsWith('nexoria-close-ticket')) {
        await ticketHandler(interaction);
      } else {
        await suggestionReview(interaction);
      }
    }
  } catch (err) {
    await logError(interaction.guild, err, `interaction:${interaction.commandName || interaction.customId}`);
    const reply = { content: '❌ Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

// Express app: serves the OAuth dashboard, a real DB-checking health
// endpoint, and satisfies Render's free-tier "open port" requirement.
const app = express();

app.get('/health', async (_, res) => {
  try {
    await healthCheck();
    res.status(200).json({ status: 'ok', discord: client.isReady() ? 'connected' : 'connecting' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/', buildDashboard(client));

(async () => {
  await initDb();
  app.listen(process.env.PORT || 3000, () => console.log('🌐 Dashboard + health check listening.'));
  await client.login(process.env.DISCORD_TOKEN);
  startScheduler(client);
})();
