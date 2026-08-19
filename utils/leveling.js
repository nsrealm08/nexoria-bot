const { pool } = require('../database');

const xpForLevel = (level) => 5 * (level ** 2) + 50 * level + 100;

async function isNoXp(guildId, channelId) {
  const { rows } = await pool.query('SELECT 1 FROM noxp_channels WHERE guild_id=$1 AND channel_id=$2', [guildId, channelId]);
  return rows.length > 0;
}

async function addXp(guildId, userId) {
  const now = Date.now();
  let { rows } = await pool.query('SELECT * FROM levels WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  let row = rows[0];
  if (!row) {
    await pool.query('INSERT INTO levels (guild_id, user_id, xp, level, last_msg) VALUES ($1,$2,0,0,0)', [guildId, userId]);
    row = { xp: 0, level: 0, last_msg: 0 };
  }
  if (now - Number(row.last_msg) < 60000) return null;

  const gained = Math.floor(Math.random() * 10) + 15;
  let xp = row.xp + gained;
  let level = row.level;
  let leveledUp = false;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    leveledUp = true;
  }

  await pool.query('UPDATE levels SET xp=$1, level=$2, last_msg=$3 WHERE guild_id=$4 AND user_id=$5',
    [xp, level, now, guildId, userId]);

  return leveledUp ? level : null;
}

async function getRank(guildId, userId) {
  const { rows } = await pool.query('SELECT * FROM levels WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows[0];
}

async function getLeaderboard(guildId, limit = 10) {
  const { rows } = await pool.query(
    'SELECT * FROM levels WHERE guild_id=$1 ORDER BY level DESC, xp DESC LIMIT $2', [guildId, limit]);
  return rows;
}

async function getLevelRewards(guildId) {
  const { rows } = await pool.query('SELECT * FROM level_rewards WHERE guild_id=$1 ORDER BY level ASC', [guildId]);
  return rows;
}

async function setLevelReward(guildId, level, roleId) {
  await pool.query(
    `INSERT INTO level_rewards (guild_id, level, role_id) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, level) DO UPDATE SET role_id=excluded.role_id`,
    [guildId, level, roleId]);
}

module.exports = { addXp, getRank, getLeaderboard, xpForLevel, isNoXp, getLevelRewards, setLevelReward };
