const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = async (member) => {
  const settings = db.prepare('SELECT * FROM settings WHERE guildId=?').get(member.guild.id);
  if (!settings?.welcomeChannel) return;
  const channel = member.guild.channels.cache.get(settings.welcomeChannel);
  if (!channel) return;

  const text = (settings.welcomeMsg || 'Welcome {user} to {server}!')
    .replace('{user}', `<@${member.id}>`)
    .replace('{server}', member.guild.name);

  await channel.send({ embeds: [new EmbedBuilder().setColor('Green').setDescription(text)
    .setThumbnail(member.user.displayAvatarURL())] });
};
