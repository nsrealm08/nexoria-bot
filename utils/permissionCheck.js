const PERMISSION_LABELS = {
  KickMembers: 'Kick Members',
  BanMembers: 'Ban Members',
  ModerateMembers: 'Timeout Members',
  ManageRoles: 'Manage Roles',
  ManageMessages: 'Manage Messages',
  ManageChannels: 'Manage Channels',
  ManageThreads: 'Manage Threads',
  CreatePrivateThreads: 'Create Private Threads',
  SendMessages: 'Send Messages'
};

async function requireBotPermissions(interaction, permissionFlags) {
  const me = interaction.guild.members.me;
  if (!me) {
    await interaction.reply({ content: '❌ Nexoria couldn\'t verify its own permissions right now — try again in a moment.', ephemeral: true }).catch(() => {});
    return false;
  }

  const missing = permissionFlags.filter(p => !me.permissions.has(p));
  if (missing.length === 0) return true;

  const names = missing.map(p => PERMISSION_LABELS[p] || p).join(', ');
  await interaction.reply({
    content: `❌ Nexoria is missing the **${names}** permission${missing.length > 1 ? 's' : ''} needed for this. Check its role in Server Settings → Roles and try again.`,
    ephemeral: true
  }).catch(() => {});
  return false;
}

function describePermissionError(err) {
  if (err?.code === 50013) return 'Nexoria doesn\'t have permission to do that here — check its role and any channel-specific permission overwrites.';
  if (err?.code === 50001) return 'Nexoria can\'t see or access that channel/thread.';
  return null;
}

module.exports = { requireBotPermissions, describePermissionError };
