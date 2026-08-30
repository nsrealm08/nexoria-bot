const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

function emojiKey(emoji) {
  return emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
}

async function getSettings(guildId) {
  const { rows } = await pool.query(
    'SELECT starboard_channel, starboard_emoji, starboard_threshold FROM settings WHERE guild_id=$1', [guildId]);
  return rows[0];
}

async function countStars(reaction, authorId) {
  const users = await reaction.users.fetch();
  let count = users.filter(u => !u.bot).size;
  if (users.has(authorId)) count -= 1; // self-stars don't count
  return Math.max(0, count);
}

function buildStarboardEmbed(message, starCount, emoji) {
  const embed = new EmbedBuilder()
    .setColor('Gold')
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(message.content || '*[no text content]*')
    .addFields({ name: '\u200b', value: `[Jump to message](${message.url})` })
    .setTimestamp(message.createdTimestamp);

  const image = message.attachments.find(a => a.contentType?.startsWith('image/'));
  if (image) embed.setImage(image.url);

  return { content: `${emoji} **${starCount}** — ${message.channel}`, embeds: [embed] };
}

async function handleReactionChange(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

  const message = reaction.message;
  if (!message.guild) return;

  const settings = await getSettings(message.guild.id);
  if (!settings?.starboard_channel) return;
  if (emojiKey(reaction.emoji) !== settings.starboard_emoji) return;
  if (message.author.bot) return;

  const starboardChannel = message.guild.channels.cache.get(settings.starboard_channel);
  if (!starboardChannel || starboardChannel.id === message.channel.id) return;

  const starCount = await countStars(reaction, message.author.id);
  const { rows } = await pool.query(
    'SELECT * FROM starboard_posts WHERE guild_id=$1 AND original_message_id=$2', [message.guild.id, message.id]);
  const existing = rows[0];

  if (existing) {
    const starboardMessage = await starboardChannel.messages.fetch(existing.starboard_message_id).catch(() => null);
    if (starboardMessage) {
      await starboardMessage.edit(buildStarboardEmbed(message, starCount, settings.starboard_emoji)).catch(() => {});
    }
    await pool.query('UPDATE starboard_posts SET star_count=$1 WHERE guild_id=$2 AND original_message_id=$3',
      [starCount, message.guild.id, message.id]);
    return;
  }

  if (starCount < settings.starboard_threshold) return;

  const posted = await starboardChannel.send(buildStarboardEmbed(message, starCount, settings.starboard_emoji)).catch(() => null);
  if (!posted) return;

  await pool.query(
    'INSERT INTO starboard_posts (guild_id, original_message_id, starboard_message_id, star_count) VALUES ($1,$2,$3,$4)',
    [message.guild.id, message.id, posted.id, starCount]);
}

module.exports = { handleReactionChange };
