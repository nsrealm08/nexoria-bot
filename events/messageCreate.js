const { EmbedBuilder } = require('discord.js');
const db = require('../database');
const { addXp } = require('../utils/leveling');

module.exports = async (message) => {
  if (message.author.bot || !message.guild) return;

  const newLevel = addXp(message.guild.id, message.author.id);
  if (newLevel === null) return;

  const settings = db.prepare('SELECT * FROM settings WHERE guildId=?').get(message.guild.id);
  const channel = settings?.levelChannel ? message.guild.channels.cache.get(settings.levelChannel) : message.channel;
  if (!channel) return;

  await channel.send({ embeds: [new EmbedBuilder().setColor('Purple')
    .setDescription(`🎉 ${message.author} leveled up to **Level ${newLevel}**!`)] });
};
