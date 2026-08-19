const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { logAction } = require('../utils/caseLog');
const { ensureMuteRole } = require('../utils/mute');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('kick').setDescription('Kick a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick(reason);
      await logAction(interaction.guild, { action: 'Kick', target: user, moderator: interaction.user, reason, color: 'Orange' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Orange').setDescription(`👢 Kicked **${user.tag}** — ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('ban').setDescription('Ban a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      await interaction.guild.members.ban(user.id, { reason });
      await logAction(interaction.guild, { action: 'Ban', target: user, moderator: interaction.user, reason, color: 'Red' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`🔨 Banned **${user.tag}** — ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('timeout').setDescription('Timeout a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(minutes * 60 * 1000, reason);
      await logAction(interaction.guild, { action: `Timeout (${minutes}m)`, target: user, moderator: interaction.user, reason, color: 'Yellow' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription(`🔇 Timed out **${user.tag}** for ${minutes}m — ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('mute').setDescription('Mute a member (role-based, no time limit)')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const role = await ensureMuteRole(interaction.guild);
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
      await logAction(interaction.guild, { action: 'Mute', target: user, moderator: interaction.user, reason, color: 'Grey' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Grey').setDescription(`🔕 Muted **${user.tag}** — ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('unmute').setDescription('Unmute a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const role = await ensureMuteRole(interaction.guild);
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.remove(role);
      await logAction(interaction.guild, { action: 'Unmute', target: user, moderator: interaction.user, reason: 'N/A', color: 'Green' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Green').setDescription(`🔔 Unmuted **${user.tag}**.`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('warn').setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      await pool.query('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES ($1,$2,$3,$4,$5)',
        [interaction.guild.id, user.id, interaction.user.id, reason, Date.now()]);
      await logAction(interaction.guild, { action: 'Warn', target: user, moderator: interaction.user, reason, color: 'Yellow' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription(`⚠️ Warned **${user.tag}** — ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('warnings').setDescription("View a member's warnings")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const { rows } = await pool.query('SELECT * FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY timestamp DESC', [interaction.guild.id, user.id]);
      if (!rows.length) return interaction.reply({ content: `${user.tag} has no warnings.`, ephemeral: true });
      const desc = rows.map((r, i) => `**${i + 1}.** ${r.reason} — <t:${Math.floor(Number(r.timestamp) / 1000)}:R>`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle(`Warnings for ${user.tag}`).setDescription(desc)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('purge').setDescription('Bulk delete messages')
      .addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount');
      if (amount < 1 || amount > 100) return interaction.reply({ content: 'Amount must be 1-100.', ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await logAction(interaction.guild, { action: 'Purge', target: interaction.channel, moderator: interaction.user, reason: `${deleted.size} messages`, color: 'Grey' });
      await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
    }
  }
];
