const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setqotd').setDescription('Auto-post a daily question of the day')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (omit to disable)'))
      .addIntegerOption(o => o.setName('hour').setDescription('Hour to post, 0-23 UTC (default 9)').setMinValue(0).setMaxValue(23))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const hour = interaction.options.getInteger('hour') ?? 9;

      await pool.query(
        `INSERT INTO settings (guild_id, qotd_channel, qotd_hour) VALUES ($1,$2,$3)
         ON CONFLICT (guild_id) DO UPDATE SET qotd_channel=excluded.qotd_channel, qotd_hour=excluded.qotd_hour`,
        [interaction.guild.id, channel ? channel.id : null, hour]);

      await interaction.reply({
        content: channel
          ? `✅ Question of the day will post in ${channel} at ${hour}:00 UTC.${process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY ? '' : ' (No AI key configured — using the curated question list.)'}`
          : '✅ Question of the day disabled.',
        ephemeral: true
      });
    }
  }
];
