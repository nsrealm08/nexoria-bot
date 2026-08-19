const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { addXp, isNoXp, getLevelRewards } = require('../utils/leveling');
const { checkMessage } = require('../utils/automod');

module.exports = async (message) => {
  if (message.author.bot || !message.guild) return;

  await checkMessage(message).catch(err => console.error('Automod error:', err));
  if (message.deleted) return; // automod removed it, skip XP

  if (await isNoXp(message.guild.id, message.channel.id)) return;

  const newLevel = await addXp(message.guild.id, message.author.id);
  if (newLevel === null) return;

  const { rows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [message.guild.id]);
  const settings = rows[0];
  const channel = settings?.level_channel ? message.guild.channels.cache.get(settings.level_channel) : message.channel;
  if (channel) {
    await channel.send({ embeds: [new EmbedBuilder().setColor('Purple')
      .setDescription(`🎉 ${message.author} leveled up to **Level ${newLevel}**!`)] }).catch(() => {});
  }

  const rewards = await getLevelRewards(message.guild.id);
  const due = rewards.filter(r => r.level <= newLevel);
  if (due.length) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) {
      for (const r of due) {
        if (!member.roles.cache.has(r.role_id)) await member.roles.add(r.role_id).catch(() => {});
      }
    }
  }
};
