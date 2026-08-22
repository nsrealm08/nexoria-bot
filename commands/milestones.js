const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setmilestones').setDescription('Auto-announce when the server hits a member count milestone')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (omit to disable)'))
      .addIntegerOption(o => o.setName('interval').setDescription('Announce every N members (e.g. 100)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const interval = interaction.options.getInteger('interval');
      await pool.query(
        `INSERT INTO settings (guild_id, milestone_channel, milestone_interval) VALUES ($1,$2,$3)
         ON CONFLICT (guild_id) DO UPDATE SET milestone_channel=excluded.milestone_channel, milestone_interval=excluded.milestone_interval`,
        [interaction.guild.id, channel ? channel.id : null, interval || null]);
      await interaction.reply({
        content: channel && interval ? `✅ Will announce in ${channel} every ${interval} members.` : '✅ Milestone announcements disabled.',
        ephemeral: true
      });
    }
  }
];
