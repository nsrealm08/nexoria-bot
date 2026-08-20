const { pool } = require('../database');
const { pickWinners } = require('./giveaway');
const { pruneExpiredWarnings, processExpiredTempbans } = require('./cases');

async function processGiveaways(client) {
  const { rows } = await pool.query('SELECT * FROM giveaways WHERE ended=FALSE AND end_time <= $1', [Date.now()]);
  for (const g of rows) {
    const channel = client.channels.cache.get(g.channel_id);
    if (!channel) { await pool.query('UPDATE giveaways SET ended=TRUE WHERE id=$1', [g.id]); continue; }
    const message = await channel.messages.fetch(g.message_id).catch(() => null);
    await pool.query('UPDATE giveaways SET ended=TRUE WHERE id=$1', [g.id]);
    if (!message) continue;

    const winners = await pickWinners(message, g.winner_count);
    const text = winners.length
      ? `🎉 Congrats ${winners.map(w => `<@${w.id}>`).join(', ')}! You won **${g.prize}**!`
      : `😔 No valid entries for **${g.prize}** — nobody entered.`;
    await channel.send(text).catch(() => {});
  }
}

async function processScheduledMessages(client) {
  const { rows } = await pool.query('SELECT * FROM scheduled_messages WHERE next_run <= $1', [Date.now()]);
  for (const s of rows) {
    const channel = client.channels.cache.get(s.channel_id);
    if (channel) await channel.send(s.content).catch(() => {});

    if (s.recurring === 'daily') {
      await pool.query('UPDATE scheduled_messages SET next_run = next_run + 86400000 WHERE id=$1', [s.id]);
    } else if (s.recurring === 'weekly') {
      await pool.query('UPDATE scheduled_messages SET next_run = next_run + 604800000 WHERE id=$1', [s.id]);
    } else {
      await pool.query('DELETE FROM scheduled_messages WHERE id=$1', [s.id]);
    }
  }
}

async function snapshotDailyStats(client) {
  const today = new Date().toISOString().slice(0, 10);
  for (const guild of client.guilds.cache.values()) {
    await pool.query(
      `INSERT INTO guild_daily_stats (guild_id, day, member_count) VALUES ($1,$2,$3)
       ON CONFLICT (guild_id, day) DO UPDATE SET member_count=excluded.member_count`,
      [guild.id, today, guild.memberCount]).catch(() => {});
  }
}

function startScheduler(client) {
  let lastStatDay = null;

  setInterval(async () => {
    try {
      await processGiveaways(client);
      await processScheduledMessages(client);
      await processExpiredTempbans(client);
      await pruneExpiredWarnings();

      const today = new Date().toISOString().slice(0, 10);
      if (today !== lastStatDay) {
        lastStatDay = today;
        await snapshotDailyStats(client);
      }
    } catch (err) {
      console.error('Scheduler tick error:', err);
    }
  }, 30000);

  console.log('⏱️  Scheduler started (giveaways, announcements, tempbans, stats — every 30s).');
}

module.exports = { startScheduler };
