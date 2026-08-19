const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS levels (
      guild_id TEXT, user_id TEXT, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 0,
      last_msg BIGINT DEFAULT 0, PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      guild_id TEXT PRIMARY KEY, welcome_channel TEXT, welcome_msg TEXT,
      level_channel TEXT, log_channel TEXT, mute_role TEXT
    );
    CREATE TABLE IF NOT EXISTS reaction_roles (
      message_id TEXT, emoji TEXT, role_id TEXT, guild_id TEXT,
      group_name TEXT, exclusive BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (message_id, emoji)
    );
    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY, guild_id TEXT, user_id TEXT,
      moderator_id TEXT, reason TEXT, timestamp BIGINT
    );
    CREATE TABLE IF NOT EXISTS level_rewards (
      guild_id TEXT, level INTEGER, role_id TEXT, PRIMARY KEY (guild_id, level)
    );
    CREATE TABLE IF NOT EXISTS noxp_channels (
      guild_id TEXT, channel_id TEXT, PRIMARY KEY (guild_id, channel_id)
    );
    CREATE TABLE IF NOT EXISTS automod_settings (
      guild_id TEXT PRIMARY KEY, banned_words TEXT[] DEFAULT '{}',
      block_invites BOOLEAN DEFAULT FALSE, mass_mention_limit INTEGER DEFAULT 0,
      spam_limit INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS role_menus (
      message_id TEXT PRIMARY KEY, guild_id TEXT, channel_id TEXT, exclusive BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS role_menu_options (
      message_id TEXT, role_id TEXT, label TEXT, PRIMARY KEY (message_id, role_id)
    );
  `);
  console.log('✅ Database ready.');
}

module.exports = { pool, init };
