const { pool } = require('../database');

async function getAskRole(guildId) {
  const { rows } = await pool.query('SELECT ask_role FROM settings WHERE guild_id=$1', [guildId]);
  return rows[0]?.ask_role || null;
}

async function checkAccess(interaction) {
  const roleId = await getAskRole(interaction.guild.id);
  if (!roleId) {
    await interaction.reply({ content: '❌ AI commands aren\'t set up on this server yet — ask an admin to run `/setaskrole`.', ephemeral: true });
    return false;
  }
  if (!interaction.member.roles.cache.has(roleId)) {
    await interaction.reply({ content: `❌ You need the <@&${roleId}> role to use this.`, ephemeral: true });
    return false;
  }
  return true;
}

// For mention-reply — silent on failure rather than replying, since an
// incidental @mention shouldn't spam a permission-denied message at people
// who never intended to trigger AI.
async function checkAccessSilent(guildId, member) {
  const roleId = await getAskRole(guildId);
  if (!roleId) return false;
  return member.roles.cache.has(roleId);
}

module.exports = { checkAccess, checkAccessSilent, getAskRole };
