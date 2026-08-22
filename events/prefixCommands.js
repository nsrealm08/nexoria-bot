const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getRank, getLeaderboard } = require('../utils/leveling');
const { buildRankCard } = require('../utils/rankCard');

const COMMANDS = ['ping', 'avatar', 'userinfo', 'serverinfo', 'rank', 'leaderboard', 'help'];

async function handle(message, prefix) {
  const withoutPrefix = message.content.slice(prefix.length).trim();
  const [cmd] = withoutPrefix.split(/\s+/);
  const name = (cmd || '').toLowerCase();
  if (!COMMANDS.includes(name)) return false;

  const mentioned = message.mentions.users.first();
  const targetUser = mentioned || message.author;

  if (name === 'help') {
    await message.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('Quick commands')
      .setDescription(COMMANDS.map(c => `\`${prefix}${c}\``).join(' · ') + '\n\nFor moderation and full configuration, use Nexoria\'s slash commands (type `/`).')] });
    return true;
  }

  if (name === 'ping') {
    await message.reply(`🏓 Pong! WS: ${message.client.ws.ping}ms`);
    return true;
  }

  if (name === 'avatar') {
    await message.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle(`${targetUser.tag}'s avatar`).setImage(targetUser.displayAvatarURL({ size: 512 }))] });
    return true;
  }

  if (name === 'userinfo') {
    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    const embed = new EmbedBuilder().setColor('Red').setTitle(targetUser.tag).setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'User ID', value: targetUser.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>`, inline: true }
      );
    if (member?.joinedTimestamp) embed.addFields({ name: 'Joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true });
    await message.reply({ embeds: [embed] });
    return true;
  }

  if (name === 'serverinfo') {
    const guild = message.guild;
    const embed = new EmbedBuilder().setColor('Red').setTitle(guild.name).setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Members', value: String(guild.memberCount), inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Roles', value: String(guild.roles.cache.size), inline: true }
      );
    await message.reply({ embeds: [embed] });
    return true;
  }

  if (name === 'rank') {
    const row = await getRank(message.guild.id, targetUser.id) || { xp: 0, level: 0 };
    const buffer = await buildRankCard(targetUser, row);
    await message.reply({ files: [new AttachmentBuilder(buffer, { name: 'rank.png' })] });
    return true;
  }

  if (name === 'leaderboard') {
    const rows = await getLeaderboard(message.guild.id, 10);
    if (!rows.length) { await message.reply('No leveling data yet.'); return true; }
    const medals = ['🥇', '🥈', '🥉'];
    const desc = rows.map((r, i) => `${medals[i] || `**#${i + 1}**`}  <@${r.user_id}> — **Level ${r.level}** · ${r.xp} XP`).join('\n');
    await message.reply({ embeds: [new EmbedBuilder().setColor('Red').setTitle('🏆 Leaderboard').setDescription(desc)] });
    return true;
  }

  return false;
}

module.exports = { handle };
