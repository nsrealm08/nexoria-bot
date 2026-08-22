require('dotenv').config();
const { REST, Routes } = require('discord.js');
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
const poll = require('./commands/poll');
const autorole = require('./commands/autorole');
const invites = require('./commands/invites');
const prefixSetting = require('./commands/prefixSetting');
const dmNotifySetting = require('./commands/dmNotifySetting');
const appealsSetting = require('./commands/appealsSetting');
const milestones = require('./commands/milestones');
const birthday = require('./commands/birthday');
const botStatusSetting = require('./commands/botStatusSetting');

const commands = [
  ...moderation, ...leveling, ...config, ...automod, ...misc, ...antiraid, ...suggestions,
  ...giveaway, ...schedule, ...language, ...tickets, ...info, ...poll, ...autorole, ...invites,
  ...prefixSetting, ...dmNotifySetting, ...appealsSetting, ...milestones, ...birthday, ...botStatusSetting
].map(c => c.data.toJSON());
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`✅ Registered ${commands.length} slash commands.`);
  } catch (err) {
    console.error(err);
  }
})();
