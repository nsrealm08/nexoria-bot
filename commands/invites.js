const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('invites').setDescription('See how many members someone has invited')
      .addUserOption(o => o.setName('user').setDescription('User (defaults to you)')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const { rows } = await pool.query(
        'SELECT COUNT(*) AS n FROM invite_uses WHERE guild_id=$1 AND inviter_id=$2',
        [interaction.guild.id, user.id]);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red')
        .setDescription(`📨 **${user.tag}** has invited **${rows[0].n}** member${rows[0].n === '1' ? '' : 's'} to this server.`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('whoinvited').setDescription('See who invited a member')
      .addUserOption(o => o.setName('user').setDescription('User (defaults to you)')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const { rows } = await pool.query(
        'SELECT * FROM invite_uses WHERE guild_id=$1 AND invited_user_id=$2 ORDER BY timestamp DESC LIMIT 1',
        [interaction.guild.id, user.id]);
      if (!rows.length) {
        return interaction.reply({ content: `No invite record for ${user.tag} — they may have joined before invite tracking started, or via a vanity URL.`, ephemeral: true });
      }
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red')
        .setDescription(`📨 **${user.tag}** was invited by <@${rows[0].inviter_id}> using code \`${rows[0].invite_code}\`.`)] });
    }
  }
];
