const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setappealschannel').setDescription('Set the channel where ban/mute appeals get posted for staff review')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await pool.query(
        `INSERT INTO settings (guild_id, appeals_channel) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET appeals_channel=excluded.appeals_channel`,
        [interaction.guild.id, channel.id]);
      await interaction.reply({ content: `✅ Ban/mute appeals will post in ${channel}.`, ephemeral: true });
    }
  }
];
