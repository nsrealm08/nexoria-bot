const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { buildWelcomeCard } = require('../utils/welcomeCard');
const { checkJoin } = require('../utils/antiraid');
const { getLang, t } = require('../utils/i18n');
const { handleMemberJoin } = require('../utils/inviteTracker');

module.exports = async (member) => {
  const usedInvite = await handleMemberJoin(member).catch(() => null);
  await checkJoin(member, usedInvite);

  const { rows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [member.guild.id]);
  const settings = rows[0];

  if (settings?.autorole && !member.user.bot) {
    await member.roles.add(settings.autorole).catch(err => {
      console.error(`Autorole failed in ${member.guild.name} (check role hierarchy/permissions):`, err.message);
    });
  }

  if (settings?.milestone_channel && settings.milestone_interval > 0 && member.guild.memberCount % settings.milestone_interval === 0) {
    const milestoneChannel = member.guild.channels.cache.get(settings.milestone_channel);
    if (milestoneChannel) {
      await milestoneChannel.send({ embeds: [new EmbedBuilder().setColor('Red')
        .setDescription(`🎉 **${member.guild.name}** just hit **${member.guild.memberCount} members**! Thanks for being part of it.`)] }).catch(() => {});
    }
  }

  if (!settings?.welcome_channel) return;
  const channel = member.guild.channels.cache.get(settings.welcome_channel);
  if (!channel) return;

  const lang = await getLang(member.guild.id);
  const text = (settings.welcome_msg || t(lang, 'welcome'))
    .replace('{user}', `<@${member.id}>`)
    .replace('{server}', member.guild.name);

  const buffer = await buildWelcomeCard(member);
  const attachment = new AttachmentBuilder(buffer, { name: 'welcome.gif' });

  await channel.send({ content: text, files: [attachment] }).catch(() => {});
};
