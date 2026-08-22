const { ActivityType } = require('discord.js');
const { pool } = require('../database');

const ACTIVITY_TYPES = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  custom: ActivityType.Custom
};

async function applyStatus(client, opts) {
  const { activityType, text, presence } = opts;
  const options = {};
  if (presence) options.status = presence;
  if (text) {
    options.activities = [{ name: text, type: ACTIVITY_TYPES[activityType] ?? ActivityType.Playing }];
  } else {
    options.activities = [];
  }
  client.user.setPresence(options);
}

async function saveStatus(opts) {
  const { activityType, text, presence } = opts;
  const entries = [['status_activity_type', activityType || ''], ['status_text', text || ''], ['status_presence', presence || 'online']];
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO bot_config (key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value=excluded.value`,
      [key, value]);
  }
}

async function loadAndApplyStatus(client) {
  const { rows } = await pool.query(`SELECT key, value FROM bot_config WHERE key IN ('status_activity_type','status_text','status_presence')`);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  if (!map.status_text && !map.status_presence) return;
  await applyStatus(client, {
    activityType: map.status_activity_type,
    text: map.status_text,
    presence: map.status_presence || 'online'
  });
}

module.exports = { applyStatus, saveStatus, loadAndApplyStatus };
