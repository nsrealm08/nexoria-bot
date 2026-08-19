const { pool } = require('../database');

async function ensureMuteRole(guild) {
  const { rows } = await pool.query('SELECT mute_role FROM settings WHERE guild_id=$1', [guild.id]);
  let roleId = rows[0]?.mute_role;
  let role = roleId ? guild.roles.cache.get(roleId) : null;

  if (!role) {
    role = await guild.roles.create({ name: 'Muted', color: 'DarkGrey', reason: 'Nexoria mute role setup' });
    await pool.query(
      `INSERT INTO settings (guild_id, mute_role) VALUES ($1,$2)
       ON CONFLICT (guild_id) DO UPDATE SET mute_role=excluded.mute_role`,
      [guild.id, role.id]);

    for (const channel of guild.channels.cache.values()) {
      if (channel.permissionOverwrites) {
        await channel.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false, Speak: false }).catch(() => {});
      }
    }
  }
  return role;
}

module.exports = { ensureMuteRole };
