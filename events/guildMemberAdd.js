const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../database');
const { buildWelcomeCard } = require('../utils/welcomeCard');
const { checkJoin } = require('../utils/antiraid');
const { getLang, t } = require('../utils/i18n');

module.exports = async (member) => {
  await checkJoin(member);

  const { rows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [member.guild.id]);
  const settings = rows[0];
  if (!settings?.welcome_channel) return;
  const channel = member.guild.channels.cache.get(settings.welcome_channel);
  if (!channel) return;

  const lang = await getLang(member.guild.id);
  const text = (settings.welcome_msg || t(lang, 'welcome'))
    .replace('{user}', `<@${member.id}>`)
    .replace('{server}', member.guild.name);

  const buffer = await buildWelcomeCard(member);
  const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
  const embed = new EmbedBuilder().setColor('Green').setDescription(text).setImage('attachment://welcome.png');

  await channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
};
