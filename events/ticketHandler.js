const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

async function openTicket(interaction) {
  const { rows } = await pool.query('SELECT ticket_channel, ticket_staff_role FROM settings WHERE guild_id=$1', [interaction.guild.id]);
  const settings = rows[0];
  if (!settings?.ticket_channel) {
    return interaction.reply({ content: '❌ Tickets aren\'t configured on this server.', ephemeral: true });
  }

  const parentChannel = interaction.guild.channels.cache.get(settings.ticket_channel);
  if (!parentChannel) {
    return interaction.reply({ content: '❌ The configured ticket channel no longer exists.', ephemeral: true });
  }

  const me = interaction.guild.members.me;
  const channelPerms = me ? parentChannel.permissionsFor(me) : null;
  if (!channelPerms?.has(PermissionFlagsBits.CreatePrivateThreads)) {
    return interaction.reply({ content: '❌ Nexoria is missing the **Create Private Threads** permission in that channel — ask a server admin to grant it.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  let thread;
  try {
    thread = await parentChannel.threads.create({
      name: `ticket-${interaction.user.username}`.slice(0, 90),
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Ticket opened by ${interaction.user.tag}`
    });
  } catch (err) {
    console.error('Private thread creation failed, ticket not opened:', err.message);
    return interaction.editReply({ content: '❌ Couldn\'t create a ticket thread — Nexoria may be missing the "Create Private Threads" permission in that channel.' });
  }

  await thread.members.add(interaction.user.id).catch(() => {});

  if (settings.ticket_staff_role) {
    const role = interaction.guild.roles.cache.get(settings.ticket_staff_role);
    if (role) {
      const staffMembers = [...role.members.values()].slice(0, 25);
      for (const m of staffMembers) {
        await thread.members.add(m.id).catch(() => {});
      }
    }
  }

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nexoria-close-ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Secondary)
  );
  await thread.send({
    content: settings.ticket_staff_role ? `${interaction.user} · <@&${settings.ticket_staff_role}>` : `${interaction.user}`,
    embeds: [new EmbedBuilder().setColor('Red').setDescription('Thanks for reaching out! Describe your issue and a staff member will help shortly.')],
    components: [closeRow]
  });

  await interaction.editReply({ content: `✅ Ticket opened: ${thread}` });
}

async function closeTicket(interaction) {
  const thread = interaction.channel;
  const isStaff = interaction.memberPermissions.has(PermissionFlagsBits.ManageThreads);
  const isOpener = thread.name.includes(interaction.user.username.slice(0, 20));
  if (!isStaff && !isOpener) {
    return interaction.reply({ content: '❌ Only staff or the ticket opener can close this.', ephemeral: true });
  }

  await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
  setTimeout(async () => {
    await thread.setArchived(true).catch(() => {});
    await thread.setLocked(true).catch(() => {});
  }, 5000);
}

module.exports = async (interaction) => {
  if (interaction.customId === 'nexoria-open-ticket') return openTicket(interaction);
  if (interaction.customId === 'nexoria-close-ticket') return closeTicket(interaction);
};
