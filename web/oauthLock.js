const { pool } = require('../database');

async function getLockUntil() {
  const { rows } = await pool.query(`SELECT value FROM bot_config WHERE key='oauth_locked_until'`);
  const ts = rows[0]?.value ? Number(rows[0].value) : 0;
  return ts > Date.now() ? ts : null;
}

async function setLock(retryAfterSeconds) {
  const MAX_LOCK_SECONDS = 3600; // 1 hour ceiling — long enough to respect Discord's cooldown, short enough that a bad value can't lock things out indefinitely
  const capped = Math.min(Number(retryAfterSeconds) || 0, MAX_LOCK_SECONDS);
  const until = Date.now() + capped * 1000;
  await pool.query(
    `INSERT INTO bot_config (key, value) VALUES ('oauth_locked_until', $1)
     ON CONFLICT (key) DO UPDATE SET value=excluded.value`,
    [String(until)]);
  return until;
}

function formatWait(untilTimestamp) {
  const seconds = Math.max(1, Math.ceil((untilTimestamp - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  const clockTime = new Date(untilTimestamp).toUTCString().slice(17, 22); // "HH:MM"
  return { seconds, minutes, remSeconds, clockTime };
}

module.exports = { getLockUntil, setLock, formatWait };
