const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Prevents an idle-client network error (e.g. Neon dropping a connection)
// from crashing the whole process — pg re-establishes new connections
// on the next query automatically.
pool.on('error', (err) => console.error('⚠️ Unexpected Postgres pool error (recovering):', err.message));

async function healthCheck() {
  await pool.query('SELECT 1');
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS levels (
      guild_id TEXT, user_id TEXT, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 0,
      last_msg BIGINT DEFAULT 0, PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      guild_id TEXT PRIMARY KEY, welcome_channel TEXT, welcome_msg TEXT,
      level_channel TEXT, log_channel TEXT, mute_role TEXT, suggestions_channel TEXT,
      warn_expire_days INTEGER, language TEXT DEFAULT 'en',
      ticket_channel TEXT, ticket_staff_role TEXT, autorole TEXT, command_prefix TEXT,
      dm_notifications BOOLEAN DEFAULT TRUE, appeals_channel TEXT,
      milestone_channel TEXT, milestone_interval INTEGER,
      birthday_channel TEXT, transcript_channel TEXT
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
      spam_limit INTEGER DEFAULT 0, ai_moderation BOOLEAN DEFAULT FALSE, ai_provider TEXT DEFAULT 'groq'
    );
    CREATE TABLE IF NOT EXISTS role_menus (
      message_id TEXT PRIMARY KEY, guild_id TEXT, channel_id TEXT, exclusive BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS role_menu_options (
      message_id TEXT, role_id TEXT, label TEXT, PRIMARY KEY (message_id, role_id)
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY, guild_id TEXT, message_id TEXT, channel_id TEXT,
      user_id TEXT, content TEXT, status TEXT DEFAULT 'pending', created_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS antiraid_settings (
      guild_id TEXT PRIMARY KEY, enabled BOOLEAN DEFAULT FALSE,
      join_threshold INTEGER DEFAULT 5, window_seconds INTEGER DEFAULT 10,
      action TEXT DEFAULT 'lockdown', locked BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY, guild_id TEXT, user_id TEXT, moderator_id TEXT,
      action TEXT, reason TEXT, timestamp BIGINT, expires_at BIGINT, active BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS giveaways (
      id SERIAL PRIMARY KEY, guild_id TEXT, channel_id TEXT, message_id TEXT,
      prize TEXT, winner_count INTEGER, end_time BIGINT, ended BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id SERIAL PRIMARY KEY, guild_id TEXT, channel_id TEXT, content TEXT,
      next_run BIGINT, recurring TEXT DEFAULT 'none', created_by TEXT
    );
    CREATE TABLE IF NOT EXISTS guild_daily_stats (
      guild_id TEXT, day DATE, member_count INTEGER DEFAULT 0, message_count INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, day)
    );
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS mute_role TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS suggestions_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS warn_expire_days INTEGER;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
    ALTER TABLE reaction_roles ADD COLUMN IF NOT EXISTS group_name TEXT;
    ALTER TABLE reaction_roles ADD COLUMN IF NOT EXISTS exclusive BOOLEAN DEFAULT FALSE;
    CREATE TABLE IF NOT EXISTS polls (
      id SERIAL PRIMARY KEY, guild_id TEXT, channel_id TEXT, message_id TEXT,
      question TEXT, options TEXT[], mode TEXT DEFAULT 'button',
      end_time BIGINT, ended BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id INTEGER, user_id TEXT, option_index INTEGER, PRIMARY KEY (poll_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS invite_uses (
      id SERIAL PRIMARY KEY, guild_id TEXT, inviter_id TEXT, invited_user_id TEXT,
      invite_code TEXT, timestamp BIGINT
    );
    CREATE TABLE IF NOT EXISTS birthdays (
      guild_id TEXT, user_id TEXT, month INTEGER, day INTEGER, PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY, value TEXT
    );
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS ticket_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS ticket_staff_role TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS autorole TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS command_prefix TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS dm_notifications BOOLEAN DEFAULT TRUE;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS appeals_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS milestone_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS milestone_interval INTEGER;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS birthday_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS transcript_channel TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS ask_role TEXT;
    ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS ai_moderation BOOLEAN DEFAULT FALSE;
    ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'groq';
  `);
  console.log('✅ Database ready.');
}

module.exports = { pool, init, healthCheck };

