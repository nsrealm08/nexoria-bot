const { pool } = require('../database');
const { recordCase } = require('./cases');

const joinTracker = new Map(); // guildId -> timestamps[]

async function getSettings(guildId) {
  const { rows } = await pool.query('SELECT * FROM antiraid_settings WHERE guild_id=$1', [guildId]);
  return rows[0];
}

async function lockdown(guild) {
  const everyone = guild.roles.everyone;
  for (const channel of guild.channels.cache.values()) {
    if (channel.permissionOverwrites) {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false }).catch(() => {});
    }
  }
  await pool.query('UPDATE antiraid_settings SET locked=TRUE WHERE guild_id=$1', [guild.id]);
  await recordCase(guild, {
    action: 'Anti-raid Lockdown', target: guild.name, moderator: 'Nexoria Anti-raid',
    reason: 'Unusual join rate detected — server locked. Use /unlock to lift.', color: 'DarkRed'
  });
}

async function checkJoin(member) {
  const settings = await getSettings(member.guild.id);
  if (!settings?.enabled || settings.locked) return;

  const key = member.guild.id;
  const now = Date.now();
  const windowMs = settings.window_seconds * 1000;
  const timestamps = (joinTracker.get(key) || []).filter(t => now - t < windowMs);
  timestamps.push(now);
  joinTracker.set(key, timestamps);

  if (timestamps.length < settings.join_threshold) return;

  if (settings.action === 'kick') {
    await member.kick('Anti-raid: mass join detected').catch(() => {});
    await recordCase(member.guild, {
      action: 'Anti-raid Kick', target: member.user, moderator: 'Nexoria Anti-raid',
      reason: 'Joined during a detected mass-join spike', color: 'DarkRed'
    });
  } else {
    await lockdown(member.guild);
  }
}

module.exports = { checkJoin, lockdown };
