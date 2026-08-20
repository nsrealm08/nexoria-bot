const { EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

async function recordCase(guild, { action, target, moderator, reason, expiresAt = null, color = 'Red' }) {
  const targetId = target?.id || null;
  const modId = moderator?.id || (typeof moderator === 'string' ? null : moderator?.id);
  const { rows } = await pool.query(
    `INSERT INTO cases (guild_id, user_id, moderator_id, action, reason, timestamp, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [guild.id, targetId, modId, action, reason || 'No reason provided', Date.now(), expiresAt]);
  const caseId = rows[0].id;

  const { rows: s } = await pool.query('SELECT log_channel FROM settings WHERE guild_id=$1', [guild.id]);
  const channel = s[0]?.log_channel ? guild.channels.cache.get(s[0].log_channel) : null;
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Case #${caseId} — ${action}`)
      .addFields(
        { name: 'Target', value: target?.tag ? target.tag : String(target ?? 'N/A'), inline: true },
        { name: 'Moderator', value: moderator?.tag ? moderator.tag : String(moderator ?? 'System'), inline: true },
        { name: 'Reason', value: reason || 'No reason provided' }
      )
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
  return caseId;
}

async function getCases(guildId, userId, limit = 15) {
  const { rows } = await pool.query(
    'SELECT * FROM cases WHERE guild_id=$1 AND user_id=$2 ORDER BY timestamp DESC LIMIT $3',
    [guildId, userId, limit]);
  return rows;
}

async function editCaseReason(guildId, caseId, newReason) {
  const { rowCount } = await pool.query(
    'UPDATE cases SET reason=$1 WHERE id=$2 AND guild_id=$3', [newReason, caseId, guildId]);
  return rowCount > 0;
}

async function pruneExpiredWarnings() {
  await pool.query(
    `UPDATE cases SET active=FALSE WHERE action='Warn' AND active=TRUE AND expires_at IS NOT NULL AND expires_at <= $1`,
    [Date.now()]);
}

async function processExpiredTempbans(client) {
  const { rows } = await pool.query(
    `SELECT * FROM cases WHERE action='Tempban' AND active=TRUE AND expires_at IS NOT NULL AND expires_at <= $1`,
    [Date.now()]);
  for (const row of rows) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) continue;
    await guild.members.unban(row.user_id, 'Temp-ban expired').catch(() => {});
    await pool.query('UPDATE cases SET active=FALSE WHERE id=$1', [row.id]);
    await recordCase(guild, {
      action: 'Unban (auto)', target: { id: row.user_id, tag: `<@${row.user_id}>` },
      moderator: 'Nexoria Scheduler', reason: 'Temp-ban duration elapsed', color: 'Green'
    });
  }
}

module.exports = { recordCase, getCases, editCaseReason, pruneExpiredWarnings, processExpiredTempbans };
