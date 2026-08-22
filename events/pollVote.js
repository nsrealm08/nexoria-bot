const { pool } = require('../database');
const { buildResultsEmbed } = require('../utils/pollResults');

module.exports = async (interaction) => {
  const match = interaction.customId.match(/^nexoria-poll-vote-(\d+)$/);
  if (!match) return;
  const optionIndex = Number(match[1]);

  const { rows } = await pool.query('SELECT * FROM polls WHERE message_id=$1', [interaction.message.id]);
  const poll = rows[0];
  if (!poll || poll.ended) {
    return interaction.reply({ content: '❌ This poll is closed.', ephemeral: true });
  }

  await pool.query(
    `INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES ($1,$2,$3)
     ON CONFLICT (poll_id, user_id) DO UPDATE SET option_index=excluded.option_index`,
    [poll.id, interaction.user.id, optionIndex]);

  const { rows: voteRows } = await pool.query('SELECT option_index, COUNT(*) AS n FROM poll_votes WHERE poll_id=$1 GROUP BY option_index', [poll.id]);
  const counts = poll.options.map((_, i) => {
    const row = voteRows.find(v => v.option_index === i);
    return row ? Number(row.n) : 0;
  });

  const embed = buildResultsEmbed(poll.question, poll.options, counts, { mode: 'button' });
  await interaction.update({ embeds: [embed] });
};
