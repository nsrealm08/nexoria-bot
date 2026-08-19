const Database = require('better-sqlite3');
const db = new Database('bot.db');

db.exec(`
CREATE TABLE IF NOT EXISTS levels (
  guildId TEXT, userId TEXT, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 0,
  lastMsg INTEGER DEFAULT 0, PRIMARY KEY (guildId, userId)
);
CREATE TABLE IF NOT EXISTS settings (
  guildId TEXT PRIMARY KEY, welcomeChannel TEXT, welcomeMsg TEXT,
  levelChannel TEXT, logChannel TEXT
);
CREATE TABLE IF NOT EXISTS reaction_roles (
  messageId TEXT, emoji TEXT, roleId TEXT, guildId TEXT,
  PRIMARY KEY (messageId, emoji)
);
CREATE TABLE IF NOT EXISTS warnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, userId TEXT,
  moderatorId TEXT, reason TEXT, timestamp INTEGER
);
`);

module.exports = db;
