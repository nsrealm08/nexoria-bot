const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

async function logAction(guild, { action, target, moderator, reason, color = 'Red' }) {
  const { rows } = await pool.query('SELECT log_channel FROM settings WHERE guild_id=$1', [guild.id]);
  const channelId = rows[0]?.log_channel;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Case: ${action}`)
    .addFields(
      { name: 'Target', value: target ? `${target.tag ?? target}` : 'N/A', inline: true },
      { name: 'Moderator', value: moderator ? `${moderator.tag ?? moderator}` : 'System', inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logAction };
