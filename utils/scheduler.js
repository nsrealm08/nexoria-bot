const { pool } = require('../database');
const { pickWinners } = require('./giveaway');
const { pruneExpiredWarnings, processExpiredTempbans } = require('./cases');
const { buildResultsEmbed } = require('./pollResults');

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

async function processPolls(client) {
  const { rows } = await pool.query(
    `SELECT * FROM polls WHERE ended=FALSE AND end_time IS NOT NULL AND end_time <= $1`, [Date.now()]);
  for (const poll of rows) {
    await finalizePoll(client, poll);
  }
}

async function finalizePoll(client, poll) {
  const channel = client.channels.cache.get(poll.channel_id);
  if (!channel) { await pool.query('UPDATE polls SET ended=TRUE WHERE id=$1', [poll.id]); return; }
  const message = await channel.messages.fetch(poll.message_id).catch(() => null);
  await pool.query('UPDATE polls SET ended=TRUE WHERE id=$1', [poll.id]);
  if (!message) return;

  let counts;
  if (poll.mode === 'button') {
    const { rows: voteRows } = await pool.query('SELECT option_index, COUNT(*) AS n FROM poll_votes WHERE poll_id=$1 GROUP BY option_index', [poll.id]);
    counts = poll.options.map((_, i) => {
      const row = voteRows.find(v => v.option_index === i);
      return row ? Number(row.n) : 0;
    });
  } else {
    const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    counts = poll.options.map((_, i) => {
      const reaction = message.reactions.cache.get(numberEmoji[i]);
      return reaction ? Math.max(0, reaction.count - 1) : 0; // -1 for the bot's own reaction
    });
  }

  const embed = buildResultsEmbed(poll.question, poll.options, counts, { ended: true, mode: poll.mode });
  await message.edit({ embeds: [embed], components: [] }).catch(() => {});
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

async function checkBirthdays(client) {
  const now = new Date();
  const month = now.getMonth() + 1, day = now.getDate();
  const { rows } = await pool.query('SELECT * FROM birthdays WHERE month=$1 AND day=$2', [month, day]);

  for (const b of rows) {
    const guild = client.guilds.cache.get(b.guild_id);
    if (!guild) continue;
    const { rows: s } = await pool.query('SELECT birthday_channel FROM settings WHERE guild_id=$1', [b.guild_id]);
    const channel = s[0]?.birthday_channel ? guild.channels.cache.get(s[0].birthday_channel) : null;
    if (!channel) continue;
    await channel.send(`🎂 Happy birthday, <@${b.user_id}>! Hope it's a great one.`).catch(() => {});
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
      await processPolls(client);

      const today = new Date().toISOString().slice(0, 10);
      if (today !== lastStatDay) {
        lastStatDay = today;
        await snapshotDailyStats(client);
        await checkBirthdays(client);
      }
    } catch (err) {
      console.error('Scheduler tick error:', err);
    }
  }, 30000);

  console.log('⏱️  Scheduler started (giveaways, announcements, tempbans, polls, birthdays, stats — every 30s).');
}

module.exports = { startScheduler, finalizePoll };
