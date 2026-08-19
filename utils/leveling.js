const db = require('../database');

const xpForLevel = (level) => 5 * (level ** 2) + 50 * level + 100;

function addXp(guildId, userId) {
  const now = Date.now();
  let row = db.prepare('SELECT * FROM levels WHERE guildId=? AND userId=?').get(guildId, userId);
  if (!row) {
    db.prepare('INSERT INTO levels (guildId, userId, xp, level, lastMsg) VALUES (?,?,0,0,0)').run(guildId, userId);
    row = { xp: 0, level: 0, lastMsg: 0 };
  }
  if (now - row.lastMsg < 60000) return null; // 60s cooldown per message xp

  const gained = Math.floor(Math.random() * 10) + 15;
  let xp = row.xp + gained;
  let level = row.level;
  let leveledUp = false;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    leveledUp = true;
  }

  db.prepare('UPDATE levels SET xp=?, level=?, lastMsg=? WHERE guildId=? AND userId=?')
    .run(xp, level, now, guildId, userId);

  return leveledUp ? level : null;
}

function getRank(guildId, userId) {
  return db.prepare('SELECT * FROM levels WHERE guildId=? AND userId=?').get(guildId, userId);
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM levels WHERE guildId=? ORDER BY level DESC, xp DESC LIMIT ?').all(guildId, limit);
}

module.exports = { addXp, getRank, getLeaderboard, xpForLevel };
