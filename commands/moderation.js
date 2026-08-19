const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');

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
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Yellow').setDescription(`🔇 Timed out **${user.tag}** for ${minutes}m — ${reason}`)] });
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
      db.prepare('INSERT INTO warnings (guildId, userId, moderatorId, reason, timestamp) VALUES (?,?,?,?,?)')
        .run(interaction.guild.id, user.id, interaction.user.id, reason, Date.now());
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
      const rows = db.prepare('SELECT * FROM warnings WHERE guildId=? AND userId=? ORDER BY timestamp DESC').all(interaction.guild.id, user.id);
      if (!rows.length) return interaction.reply({ content: `${user.tag} has no warnings.`, ephemeral: true });
      const desc = rows.map((r, i) => `**${i + 1}.** ${r.reason} — <t:${Math.floor(r.timestamp / 1000)}:R>`).join('\n');
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
      await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
    }
  }
];
