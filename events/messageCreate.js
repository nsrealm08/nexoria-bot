const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../database');
const { addXp, isNoXp, getLevelRewards } = require('../utils/leveling');
const { checkMessage } = require('../utils/automod');
const { getLang, t } = require('../utils/i18n');
const { buildLevelUpCard } = require('../utils/levelUpCard');
const { askQuestion } = require('../utils/askAI');
const { checkAccessSilent } = require('../utils/aiAccess');
const prefixCommands = require('./prefixCommands');

const mentionCooldowns = new Map(); // userId -> last-used timestamp
const MENTION_COOLDOWN_MS = 8000;

async function handleMentionReply(message, settings) {
  if (!settings?.mention_reply) return false;
  if (!message.mentions.has(message.client.user)) return false;
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) return false;

  const question = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!question) return false;

  const hasAccess = await checkAccessSilent(message.guild.id, message.member);
  if (!hasAccess) return false;

  const now = Date.now();
  const last = mentionCooldowns.get(message.author.id) || 0;
  if (now - last < MENTION_COOLDOWN_MS) return false;
  mentionCooldowns.set(message.author.id, now);

  await message.channel.sendTyping().catch(() => {});
  const result = await askQuestion(question);
  if (!result) {
    await message.reply('❌ Both AI providers failed to respond — try again in a moment.').catch(() => {});
    return true;
  }

  const answer = result.answer.length > 1900 ? `${result.answer.slice(0, 1900)}…` : result.answer;
  await message.reply(answer).catch(() => {});
  return true;
}

module.exports = async (message) => {
  if (message.author.bot || !message.guild) return;

  const { rows: settingsRows } = await pool.query('SELECT * FROM settings WHERE guild_id=$1', [message.guild.id]);
  const settings = settingsRows[0];

  if (settings?.command_prefix && message.content.startsWith(settings.command_prefix)) {
    const handled = await prefixCommands.handle(message, settings.command_prefix).catch(err => {
      console.error('Prefix command error:', err);
      return false;
    });
    if (handled) return;
  }

  const mentionHandled = await handleMentionReply(message, settings).catch(err => {
    console.error('Mention-reply error:', err);
    return false;
  });
  if (mentionHandled) return;

  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO guild_daily_stats (guild_id, day, member_count, message_count) VALUES ($1,$2,$3,1)
     ON CONFLICT (guild_id, day) DO UPDATE SET message_count = guild_daily_stats.message_count + 1`,
    [message.guild.id, today, message.guild.memberCount]).catch(() => {});

  await checkMessage(message).catch(err => console.error('Automod error:', err));
  if (message.deleted) return;

  if (await isNoXp(message.guild.id, message.channel.id)) return;

  const result = await addXp(message.guild.id, message.author.id);
  if (!result) return;
  const { oldLevel, newLevel, xp } = result;

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
