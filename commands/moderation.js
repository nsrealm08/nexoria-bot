const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');
const { recordCase, getCases, editCaseReason } = require('../utils/cases');
const { ensureMuteRole } = require('../utils/mute');
const { getLang, t } = require('../utils/i18n');

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
      await recordCase(interaction.guild, { action: 'Kick', target: user, moderator: interaction.user, reason, color: 'Orange' });
      const lang = await getLang(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Orange').setDescription(t(lang, 'kicked', { user: user.tag, reason }))] });
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
      await recordCase(interaction.guild, { action: 'Ban', target: user, moderator: interaction.user, reason, color: 'Red' });
      const lang = await getLang(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(t(lang, 'banned', { user: user.tag, reason }))] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('tempban').setDescription('Temporarily ban a member — auto-unbanned when time is up')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('hours').setDescription('Duration in hours').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const hours = interaction.options.getInteger('hours');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      await interaction.guild.members.ban(user.id, { reason });
      const expiresAt = Date.now() + hours * 3600 * 1000;
      const caseId = await recordCase(interaction.guild, { action: 'Tempban', target: user, moderator: interaction.user, reason, expiresAt, color: 'Red' });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Red')
        .setDescription(`🔨 Temp-banned **${user.tag}** for ${hours}h — ${reason} (Case #${caseId})`)] });
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
      await recordCase(interaction.guild, { action: `Timeout (${minutes}m)`, target: user, moderator: interaction.user, reason, color: 'Yellow' });
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
      await recordCase(interaction.guild, { action: 'Mute', target: user, moderator: interaction.user, reason, color: 'Grey' });
      const lang = await getLang(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Grey').setDescription(t(lang, 'muted', { user: user.tag, reason }))] });
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
      await recordCase(interaction.guild, { action: 'Unmute', target: user, moderator: interaction.user, reason: 'N/A', color: 'Green' });
      const lang = await getLang(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Green').setDescription(t(lang, 'unmuted', { user: user.tag }))] });
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
      const { rows } = await pool.query('SELECT warn_expire_days FROM settings WHERE guild_id=$1', [interaction.guild.id]);
      const expireDays = rows[0]?.warn_expire_days;
      const expiresAt = expireDays ? Date.now() + expireDays * 86400000 : null;
      const caseId = await recordCase(interaction.guild, { action: 'Warn', target: user, moderator: interaction.user, reason, expiresAt, color: 'Yellow' });
      const lang = await getLang(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription(`${t(lang, 'warned', { user: user.tag, reason })} (Case #${caseId})`)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('warnings').setDescription("View a member's active warnings")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const { rows } = await pool.query(
        `SELECT * FROM cases WHERE guild_id=$1 AND user_id=$2 AND action='Warn' AND active=TRUE ORDER BY timestamp DESC`,
        [interaction.guild.id, user.id]);
      if (!rows.length) return interaction.reply({ content: `${user.tag} has no active warnings.`, ephemeral: true });
      const desc = rows.map(r => `**#${r.id}.** ${r.reason} — <t:${Math.floor(Number(r.timestamp) / 1000)}:R>`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setTitle(`Warnings for ${user.tag}`).setDescription(desc)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setwarnexpiry').setDescription('Set how many days until warnings auto-expire (0 = never)')
      .addIntegerOption(o => o.setName('days').setDescription('Days until expiry, 0 for never').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const days = interaction.options.getInteger('days');
      await pool.query(
        `INSERT INTO settings (guild_id, warn_expire_days) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET warn_expire_days=excluded.warn_expire_days`,
        [interaction.guild.id, days || null]);
      await interaction.reply({ content: days ? `✅ Warnings now expire after ${days} day(s).` : '✅ Warnings will no longer auto-expire.', ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('modlogs').setDescription("View a member's full moderation case history")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const cases = await getCases(interaction.guild.id, user.id);
      if (!cases.length) return interaction.reply({ content: `No case history for ${user.tag}.`, ephemeral: true });
      const desc = cases.map(c => {
        const status = c.action === 'Warn' && !c.active ? ' *(expired)*' : '';
        return `**#${c.id} — ${c.action}**${status} · ${c.reason} · <t:${Math.floor(Number(c.timestamp) / 1000)}:R>`;
      }).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue').setTitle(`Case history — ${user.tag}`).setDescription(desc)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('case').setDescription('Edit the reason on an existing case')
      .addIntegerOption(o => o.setName('id').setDescription('Case ID').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('New reason').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const caseId = interaction.options.getInteger('id');
      const reason = interaction.options.getString('reason');
      const ok = await editCaseReason(interaction.guild.id, caseId, reason);
      await interaction.reply({ content: ok ? `✅ Case #${caseId} reason updated.` : `❌ No case #${caseId} found.`, ephemeral: true });
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
      await recordCase(interaction.guild, { action: 'Purge', target: interaction.channel.name, moderator: interaction.user, reason: `${deleted.size} messages`, color: 'Grey' });
      await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
    }
  }
];
