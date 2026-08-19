const { pool } = require('../database');
const { logAction } = require('./caseLog');

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
  }

  if (!violation) return;

  await message.delete().catch(() => {});
  await pool.query('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES ($1,$2,$3,$4,$5)',
    [message.guild.id, message.author.id, message.client.user.id, `Automod: ${violation}`, Date.now()]);
  await logAction(message.guild, {
    action: `Automod — ${violation}`, target: message.author, moderator: 'Nexoria Automod',
    reason: message.content.slice(0, 200), color: 'DarkRed'
  });
}

module.exports = { checkMessage };
