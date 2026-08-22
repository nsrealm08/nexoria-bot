const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../database');
const { addXp, isNoXp, getLevelRewards } = require('../utils/leveling');
const { checkMessage } = require('../utils/automod');
const { getLang, t } = require('../utils/i18n');
const { buildLevelUpCard } = require('../utils/levelUpCard');

module.exports = async (message) => {
  if (message.author.bot || !message.guild) return;

  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO guild_daily_stats (guild_id, day, member_count, message_count) VALUES ($1,$2,$3,1)
     ON CONFLICT (guild_id, day) DO UPDATE SET message_count = guild_daily_stats.message_count + 1`,
    [message.guild.id, today, message.guild.memberCount]).catch(() => {});

  await checkMessage(message).catch(err => console.error('Automod error:', err));
  if (message.deleted) return; // automod removed it, skip XP

  if (await isNoXp(message.guild.id, message.channel.id)) return;

  const result = await addXp(message.guild.id, message.author.id);
  if (!result) return;
  const { oldLevel, newLevel, xp } = result;

  const { rows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [message.guild.id]);
  const settings = rows[0];
  const channel = settings?.level_channel ? message.guild.channels.cache.get(settings.level_channel) : message.channel;
  if (channel) {
    try {
      const buffer = await buildLevelUpCard(message.author, oldLevel, newLevel, xp);
      const attachment = new AttachmentBuilder(buffer, { name: 'levelup.gif' });
      const lang = await getLang(message.guild.id);
      await channel.send({
        content: t(lang, 'levelUp', { user: message.author.toString(), level: newLevel }),
        files: [attachment]
      });
    } catch (err) {
      console.error('Level-up card render failed, falling back to text:', err);
      const lang = await getLang(message.guild.id);
      await channel.send({ embeds: [new EmbedBuilder().setColor('Purple')
        .setDescription(t(lang, 'levelUp', { user: message.author.toString(), level: newLevel }))] }).catch(() => {});
    }
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
