const { pool } = require('../database');

module.exports = async (interaction) => {
  if (interaction.customId !== 'nexoria-rolemenu') return;

  const { rows: menuRows } = await pool.query('SELECT * FROM role_menus WHERE message_id=$1', [interaction.message.id]);
  const menu = menuRows[0];
  if (!menu) return interaction.reply({ content: '❌ This role menu is no longer configured.', ephemeral: true });

  const { rows: options } = await pool.query('SELECT role_id FROM role_menu_options WHERE message_id=$1', [interaction.message.id]);
  const allRoleIds = options.map(o => o.role_id);
  const selected = interaction.values;

  const member = interaction.member;
  for (const roleId of allRoleIds) {
    const has = member.roles.cache.has(roleId);
    const wants = selected.includes(roleId);
    if (wants && !has) await member.roles.add(roleId).catch(() => {});
    if (!wants && has) await member.roles.remove(roleId).catch(() => {});
  }

  await interaction.reply({ content: '✅ Roles updated.', ephemeral: true });
};
