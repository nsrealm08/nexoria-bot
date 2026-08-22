async function buildTranscript(thread) {
  const messages = await thread.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  const sorted = [...messages.values()].reverse();
  const lines = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toISOString();
    const content = m.content || '[embed/attachment]';
    return `[${time}] ${m.author.tag}: ${content}`;
  });

  return Buffer.from(lines.join('\n') || 'No messages.', 'utf-8');
}

module.exports = { buildTranscript };
