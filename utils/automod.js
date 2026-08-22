const { pool } = require('../database');
const { recordCase } = require('./cases');
const { checkToxicity } = require('./aiModeration');

const spamTracker = new Map(); // userId -> timestamps[]
const INVITE_REGEX = /(discord\.gg|discord(app)?\.com\/invite)\/[a-zA-Z0-9-]+/i;

async function getSettings(guildId) {
  const { rows } = await pool.query('SELECT * FROM automod_settings WHERE guild_id=$1', [guildId]);
  return rows[0];
}

async function checkMessage(message) {
  const settings = await getSettings(message.guild.id);
  if (!settings) return;

  const content = message.content.toLowerCase();
  let violation = null;

  if (settings.banned_words?.length && settings.banned_words.some(w => content.includes(w))) {
    violation = 'Banned word';
  } else if (settings.block_invites && INVITE_REGEX.test(content)) {
    violation = 'Discord invite link';
  } else if (settings.mass_mention_limit > 0 && message.mentions.users.size + message.mentions.roles.size > settings.mass_mention_limit) {
    violation = 'Mass mention';
  } else if (settings.spam_limit > 0) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const timestamps = (spamTracker.get(key) || []).filter(t => now - t < 5000);
    timestamps.push(now);
    spamTracker.set(key, timestamps);
    if (timestamps.length > settings.spam_limit) violation = 'Spam';
  } else if (settings.ai_moderation && (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY)) {
    try {
      const result = await checkToxicity(message.content, settings.ai_provider);
      if (result?.flagged && result.confidence >= 0.6) {
        violation = `AI-flagged (${result.category}, ${Math.round(result.confidence * 100)}% confidence)`;
      }
    } catch (err) {
      console.error('AI moderation check failed (skipping this message):', err.message);
    }
  }

  if (!violation) return;

  const botMember = message.guild.members.me;
  const canDelete = botMember?.permissions.has('ManageMessages');
  if (canDelete) {
    await message.delete().catch(() => {});
  }

  await recordCase(message.guild, {
    action: 'Automod Warn', target: message.author, moderator: 'Nexoria Automod',
    reason: `${violation}${canDelete ? '' : ' (message NOT deleted — Nexoria is missing Manage Messages)'}: ${message.content.slice(0, 200)}`,
    color: 'DarkRed'
  });
}

module.exports = { checkMessage };
