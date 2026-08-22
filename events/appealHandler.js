const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits
} = require('discord.js');
const { pool } = require('../database');
const { ensureMuteRole } = require('../utils/mute');

async function openModal(interaction) {
  const match = interaction.customId.match(/^nexoria-appeal-open-(\d+)-(\w+)$/);
  if (!match) return;
  const [, guildId, actionType] = match;

  const modal = new ModalBuilder()
    .setCustomId(`nexoria-appeal-modal-${guildId}-${actionType}-${interaction.user.id}`)
    .setTitle('Submit an appeal');

  const input = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Why should this be reconsidered?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function submitModal(interaction, client) {
  const match = interaction.customId.match(/^nexoria-appeal-modal-(\d+)-(\w+)-(\d+)$/);
  if (!match) return;
  const [, guildId, actionType, userId] = match;
  const reasonText = interaction.fields.getTextInputValue('reason');

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return interaction.reply({ content: '❌ Could not find that server anymore.', ephemeral: true });

  const { rows } = await pool.query('SELECT appeals_channel, log_channel FROM settings WHERE guild_id=$1', [guildId]);
  const channelId = rows[0]?.appeals_channel || rows[0]?.log_channel;
  const channel = channelId ? guild.channels.cache.get(channelId) : null;
  if (!channel) return interaction.reply({ content: '❌ This server hasn\'t configured an appeals channel yet.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor('Yellow')
    .setAuthor({ name: `Appeal — ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .addFields(
      { name: 'Original action', value: actionType, inline: true },
      { name: 'User ID', value: userId, inline: true },
      { name: 'Appeal', value: reasonText }
    )
    .setTimestamp();

  const buttons = [];
  if (actionType === 'Ban' || actionType === 'Tempban') {
    buttons.push(new ButtonBuilder().setCustomId(`nexoria-appeal-unban-${guildId}-${userId}`).setLabel('Unban').setStyle(ButtonStyle.Success));
  }
  if (actionType === 'Mute') {
    buttons.push(new ButtonBuilder().setCustomId(`nexoria-appeal-unmute-${guildId}-${userId}`).setLabel('Unmute').setStyle(ButtonStyle.Success));
  }
  buttons.push(new ButtonBuilder().setCustomId(`nexoria-appeal-deny-${guildId}-${userId}`).setLabel('Deny').setStyle(ButtonStyle.Danger));

  await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(buttons)] });
  await interaction.reply({ content: '✅ Your appeal was submitted to the server\'s staff for review.', ephemeral: true });
}

async function handleStaffAction(interaction) {
  const unbanMatch = interaction.customId.match(/^nexoria-appeal-unban-(\d+)-(\d+)$/);
  const unmuteMatch = interaction.customId.match(/^nexoria-appeal-unmute-(\d+)-(\d+)$/);
  const denyMatch = interaction.customId.match(/^nexoria-appeal-deny-(\d+)-(\d+)$/);
  const match = unbanMatch || unmuteMatch || denyMatch;
  if (!match) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: '❌ Only staff (Manage Server) can act on appeals.', ephemeral: true });
  }

  const [, guildId, userId] = match;
  const guild = interaction.client.guilds.cache.get(guildId);
  let resultText = 'Denied.';

  if (unbanMatch && guild) {
    await guild.members.unban(userId, `Appeal approved by ${interaction.user.tag}`).catch(() => {});
    resultText = 'Unbanned.';
  } else if (unmuteMatch && guild) {
    const role = await ensureMuteRole(guild);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.remove(role).catch(() => {});
    resultText = 'Unmuted.';
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(denyMatch ? 'Red' : 'Green')
    .setFooter({ text: `${resultText} — reviewed by ${interaction.user.tag}` });
  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { openModal, submitModal, handleStaffAction };
