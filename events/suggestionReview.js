const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = async (interaction) => {
  if (!['suggestion-approve', 'suggestion-deny'].includes(interaction.customId)) return;

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Only staff (Manage Server) can approve or deny suggestions.', ephemeral: true });
  }

  const approve = interaction.customId === 'suggestion-approve';
  const status = approve ? 'approved' : 'denied';

  await pool.query('UPDATE suggestions SET status=$1 WHERE message_id=$2', [status, interaction.message.id]);

  const original = interaction.message.embeds[0];
  const embed = EmbedBuilder.from(original)
    .setColor(approve ? 'Green' : 'Red')
    .setFooter({ text: `Status: ${approve ? 'Approved' : 'Denied'} by ${interaction.user.tag}` });

  await interaction.update({ embeds: [embed], components: [] });
};
