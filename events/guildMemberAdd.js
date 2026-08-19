const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = async (member) => {
  const { rows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [member.guild.id]);
  const settings = rows[0];
  if (!settings?.welcome_channel) return;
  const channel = member.guild.channels.cache.get(settings.welcome_channel);
  if (!channel) return;

  const text = (settings.welcome_msg || 'Welcome {user} to {server}!')
    .replace('{user}', `<@${member.id}>`)
    .replace('{server}', member.guild.name);

  await channel.send({ embeds: [new EmbedBuilder().setColor('Green').setDescription(text)
    .setThumbnail(member.user.displayAvatarURL())] });
};
