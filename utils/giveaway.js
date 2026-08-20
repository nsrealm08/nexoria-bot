async function pickWinners(message, count) {
  const reaction = message.reactions.cache.get('🎉');
  if (!reaction) return [];
  const users = await reaction.users.fetch();
  const eligible = users.filter(u => !u.bot).map(u => u);
  const winners = [];
  const remaining = [...eligible];
  while (winners.length < count && remaining.length) {
    const idx = Math.floor(Math.random() * remaining.length);
    winners.push(remaining.splice(idx, 1)[0]);
  }
  return winners;
}

module.exports = { pickWinners };
