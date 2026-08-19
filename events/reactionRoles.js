const db = require('../database');

async function resolve(reaction, user) {
  if (user.bot) return null;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const row = db.prepare('SELECT * FROM reaction_roles WHERE messageId=? AND emoji=?')
    .get(reaction.message.id, emojiKey);
  return row;
}

module.exports = {
  add: async (reaction, user) => {
    const row = await resolve(reaction, user);
    if (!row) return;
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.add(row.roleId).catch(() => {});
  },
  remove: async (reaction, user) => {
    const row = await resolve(reaction, user);
    if (!row) return;
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.remove(row.roleId).catch(() => {});
  }
};
