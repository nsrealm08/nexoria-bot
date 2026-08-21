const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setticketchannel').setDescription('Post a ticket panel — members click a button to open a private thread with staff')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post the panel in').setRequired(true))
      .addRoleOption(o => o.setName('staff_role').setDescription('Role that gets added to new tickets').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      const staffRole = interaction.options.getRole('staff_role');

      await pool.query(
        `INSERT INTO settings (guild_id, ticket_channel, ticket_staff_role) VALUES ($1,$2,$3)
         ON CONFLICT (guild_id) DO UPDATE SET ticket_channel=excluded.ticket_channel, ticket_staff_role=excluded.ticket_staff_role`,
        [interaction.guild.id, channel.id, staffRole.id]);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Need help?')
        .setDescription('Click the button below to open a private ticket with staff.');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nexoria-open-ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket panel posted in ${channel}.`, ephemeral: true });
    }
  }
];
