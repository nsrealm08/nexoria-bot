const { EmbedBuilder } = require('discord.js');

const BAR_LENGTH = 16;

function buildResultsEmbed(question, options, counts, opts) {
  const ended = opts?.ended || false;
  const mode = opts?.mode || 'button';
  const total = counts.reduce((a, b) => a + b, 0);
  const lines = options.map((opt, i) => {
    const count = counts[i] || 0;
    const pct = total > 0 ? count / total : 0;
    const filled = Math.round(pct * BAR_LENGTH);
    const bar = '█'.repeat(filled) + '░'.repeat(BAR_LENGTH - filled);
    return `**${opt}**\n${bar}  ${count} vote${count === 1 ? '' : 's'} (${Math.round(pct * 100)}%)`;
  });

  return new EmbedBuilder()
    .setColor(ended ? 'Grey' : 'Red')
    .setTitle(`📊 ${question}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: ended ? `Poll closed · ${total} total vote${total === 1 ? '' : 's'}` : mode === 'button' ? `${total} vote${total === 1 ? '' : 's'} so far — click a button to vote` : 'React below to vote' });
}

module.exports = { buildResultsEmbed };
