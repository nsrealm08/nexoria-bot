require('dotenv').config();
const { REST, Routes } = require('discord.js');
const moderation = require('./commands/moderation');
const leveling = require('./commands/leveling');
const config = require('./commands/config');

const commands = [...moderation, ...leveling, ...config].map(c => c.data.toJSON());
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`✅ Registered ${commands.length} slash commands.`);
  } catch (err) {
    console.error(err);
  }
})();
