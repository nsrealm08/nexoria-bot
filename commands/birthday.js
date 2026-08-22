const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setbirthday').setDescription('Set your birthday for the server to celebrate')
      .addIntegerOption(o => o.setName('month').setDescription('1-12').setRequired(true).setMinValue(1).setMaxValue(12))
      .addIntegerOption(o => o.setName('day').setDescription('1-31').setRequired(true).setMinValue(1).setMaxValue(31)),
    async execute(interaction) {
      const month = interaction.options.getInteger('month');
      const day = interaction.options.getInteger('day');
      await pool.query(
        `INSERT INTO birthdays (guild_id, user_id, month, day) VALUES ($1,$2,$3,$4)
         ON CONFLICT (guild_id, user_id) DO UPDATE SET month=excluded.month, day=excluded.day`,
        [interaction.guild.id, interaction.user.id, month, day]);
      await interaction.reply({ content: `✅ Birthday set to ${MONTH_NAMES[month - 1]} ${day}.`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder().setName('removebirthday').setDescription('Remove your saved birthday'),
    async execute(interaction) {
      await pool.query('DELETE FROM birthdays WHERE guild_id=$1 AND user_id=$2', [interaction.guild.id, interaction.user.id]);
      await interaction.reply({ content: '✅ Birthday removed.', ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setbirthdaychannel').setDescription('Set the channel for birthday announcements')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      await pool.query(
        `INSERT INTO settings (guild_id, birthday_channel) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET birthday_channel=excluded.birthday_channel`,
        [interaction.guild.id, channel.id]);
      await interaction.reply({ content: `✅ Birthday announcements will post in ${channel}.`, ephemeral: true });
    }
  }
];
