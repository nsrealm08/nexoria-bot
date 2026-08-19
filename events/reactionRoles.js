const { pool } = require('../database');

async function resolve(reaction, user) {
  if (user.bot) return null;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const { rows } = await pool.query('SELECT * FROM reaction_roles WHERE message_id=$1 AND emoji=$2',
    [reaction.message.id, emojiKey]);
  return rows[0];
}

module.exports = {
  add: async (reaction, user) => {
    const row = await resolve(reaction, user);
    if (!row) return;
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    await member.roles.add(row.role_id).catch(() => {});

    if (row.exclusive && row.group_name) {
      const { rows: siblings } = await pool.query(
        'SELECT * FROM reaction_roles WHERE guild_id=$1 AND group_name=$2 AND role_id!=$3',
        [row.guild_id, row.group_name, row.role_id]);
      for (const sib of siblings) {
        await member.roles.remove(sib.role_id).catch(() => {});
        const msg = await reaction.message.channel.messages.fetch(sib.message_id).catch(() => null);
        const sibReaction = msg?.reactions.cache.find(r =>
          (r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : r.emoji.name) === sib.emoji);
        if (sibReaction) await sibReaction.users.remove(user.id).catch(() => {});
      }
    }
  },
  remove: async (reaction, user) => {
    const row = await resolve(reaction, user);
    if (!row) return;
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.remove(row.role_id).catch(() => {});
  }
};
